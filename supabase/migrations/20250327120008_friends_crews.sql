SET search_path = public, extensions;

-- ─── FRIENDSHIPS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update own friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ─── CREWS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_emoji text DEFAULT '⚔️',
  home_district text,
  leader_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  max_members integer DEFAULT 20,
  total_xp bigint DEFAULT 0,
  weekly_xp bigint DEFAULT 0,
  is_public boolean DEFAULT true,
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crews_leader_idx ON public.crews (leader_id);
CREATE INDEX crews_invite_code_idx ON public.crews (invite_code);

-- ─── CREW MEMBERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  contribution_xp bigint DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_id, user_id)
);

CREATE INDEX crew_members_user_idx ON public.crew_members (user_id);
CREATE INDEX crew_members_crew_idx ON public.crew_members (crew_id);

-- RLS
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public crews" ON public.crews
  FOR SELECT USING (is_public = true OR id IN (
    SELECT crew_id FROM public.crew_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Leaders can update own crew" ON public.crews
  FOR UPDATE USING (leader_id = auth.uid());

CREATE POLICY "Anyone can create crews" ON public.crews
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Members can view crew members" ON public.crew_members
  FOR SELECT USING (crew_id IN (
    SELECT crew_id FROM public.crew_members WHERE user_id = auth.uid()
  ) OR crew_id IN (SELECT id FROM public.crews WHERE is_public = true));

CREATE POLICY "Users can join crews" ON public.crew_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can manage members" ON public.crew_members
  FOR DELETE USING (
    crew_id IN (SELECT id FROM public.crews WHERE leader_id = auth.uid())
    OR user_id = auth.uid()
  );

-- ─── FRIEND RPCs ────────────────────────────────────────────────────────────

-- Send friend request (by username)
CREATE OR REPLACE FUNCTION public.send_friend_request(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target_id uuid;
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_target_id FROM public.profiles WHERE username = p_username;
  IF v_target_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;
  IF v_target_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cannot_add_self');
  END IF;

  SELECT id INTO v_existing_id FROM public.friendships
    WHERE (requester_id = v_user_id AND addressee_id = v_target_id)
       OR (requester_id = v_target_id AND addressee_id = v_user_id);
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_exists');
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_user_id, v_target_id, 'pending');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;

-- Accept/reject friend request
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF p_accept THEN
    UPDATE public.friendships SET status = 'accepted', updated_at = now()
    WHERE id = p_friendship_id AND addressee_id = v_user_id AND status = 'pending';
  ELSE
    DELETE FROM public.friendships
    WHERE id = p_friendship_id AND addressee_id = v_user_id AND status = 'pending';
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;

-- Get friends list
CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_friends jsonb;
  v_pending jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'friendship_id', f.id,
    'user_id', CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'level', c.level,
    'character_type', c.character_type
  )), '[]'::jsonb) INTO v_friends
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN public.characters c ON c.user_id = p.id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id) AND f.status = 'accepted';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'friendship_id', f.id,
    'user_id', f.requester_id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'created_at', f.created_at
  )), '[]'::jsonb) INTO v_pending
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.requester_id
  WHERE f.addressee_id = p_user_id AND f.status = 'pending';

  RETURN jsonb_build_object('friends', v_friends, 'pending_requests', v_pending);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;

-- ─── CREW RPCs ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_crew(p_name text, p_description text DEFAULT NULL, p_emoji text DEFAULT '⚔️', p_district text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_crew_id uuid;
BEGIN
  SELECT cm.crew_id INTO v_existing FROM public.crew_members cm WHERE cm.user_id = v_user_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_in_crew');
  END IF;

  INSERT INTO public.crews (name, description, icon_emoji, home_district, leader_id)
  VALUES (p_name, p_description, p_emoji, p_district, v_user_id)
  RETURNING id INTO v_crew_id;

  INSERT INTO public.crew_members (crew_id, user_id, role)
  VALUES (v_crew_id, v_user_id, 'leader');

  RETURN jsonb_build_object('success', true, 'crew_id', v_crew_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_crew(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_crew(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_crew RECORD;
  v_existing uuid;
  v_member_count integer;
BEGIN
  SELECT cm.crew_id INTO v_existing FROM public.crew_members cm WHERE cm.user_id = v_user_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_in_crew');
  END IF;

  SELECT * INTO v_crew FROM public.crews WHERE invite_code = p_invite_code;
  IF v_crew IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.crew_members WHERE crew_id = v_crew.id;
  IF v_member_count >= v_crew.max_members THEN
    RETURN jsonb_build_object('success', false, 'reason', 'crew_full');
  END IF;

  INSERT INTO public.crew_members (crew_id, user_id, role)
  VALUES (v_crew.id, v_user_id, 'member');

  RETURN jsonb_build_object('success', true, 'crew_id', v_crew.id, 'crew_name', v_crew.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_crew(text) TO authenticated;

-- Get crew details
CREATE OR REPLACE FUNCTION public.get_my_crew(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_crew RECORD;
  v_members jsonb;
  v_crew_id uuid;
BEGIN
  SELECT cm.crew_id INTO v_crew_id FROM public.crew_members cm WHERE cm.user_id = p_user_id LIMIT 1;
  IF v_crew_id IS NULL THEN
    RETURN jsonb_build_object('has_crew', false);
  END IF;

  SELECT * INTO v_crew FROM public.crews WHERE id = v_crew_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', cm.user_id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'role', cm.role,
    'contribution_xp', cm.contribution_xp,
    'level', c.level,
    'character_type', c.character_type,
    'joined_at', cm.joined_at
  ) ORDER BY cm.contribution_xp DESC), '[]'::jsonb) INTO v_members
  FROM public.crew_members cm
  JOIN public.profiles p ON p.id = cm.user_id
  LEFT JOIN public.characters c ON c.user_id = cm.user_id
  WHERE cm.crew_id = v_crew_id;

  RETURN jsonb_build_object(
    'has_crew', true,
    'crew', jsonb_build_object(
      'id', v_crew.id,
      'name', v_crew.name,
      'description', v_crew.description,
      'icon_emoji', v_crew.icon_emoji,
      'home_district', v_crew.home_district,
      'total_xp', v_crew.total_xp,
      'weekly_xp', v_crew.weekly_xp,
      'invite_code', v_crew.invite_code,
      'member_count', jsonb_array_length(v_members),
      'max_members', v_crew.max_members
    ),
    'members', v_members
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_crew(uuid) TO authenticated;
