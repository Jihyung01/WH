SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.create_group_chat_room(
  p_member_ids uuid[],
  p_title text,
  p_emoji text DEFAULT '👥'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me uuid := auth.uid();
  new_room uuid;
  member_id uuid;
  clean_title text := nullif(trim(coalesce(p_title, '')), '');
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;
  IF clean_title IS NULL THEN
    RAISE EXCEPTION '그룹 이름을 입력해 주세요.';
  END IF;

  INSERT INTO public.chat_rooms(type, title, emoji, created_by)
  VALUES ('group', clean_title, left(coalesce(nullif(trim(p_emoji), ''), '👥'), 8), me)
  RETURNING id INTO new_room;

  INSERT INTO public.chat_room_members(room_id, user_id, is_admin)
  VALUES (new_room, me, true)
  ON CONFLICT DO NOTHING;

  FOREACH member_id IN ARRAY coalesce(p_member_ids, ARRAY[]::uuid[]) LOOP
    IF member_id IS NOT NULL AND member_id <> me THEN
      INSERT INTO public.chat_room_members(room_id, user_id, is_admin)
      VALUES (new_room, member_id, false)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.messages(room_id, sender_id, content, message_type)
  VALUES (new_room, me, '그룹 채팅방이 열렸어요.', 'system');

  RETURN new_room;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_chat_room(uuid[], text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_group_call(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_room_members
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '방 멤버 아님';
  END IF;

  UPDATE public.chat_rooms
  SET live_video_started_at = now()
  WHERE id = p_room_id AND type <> '1on1';

  INSERT INTO public.messages(room_id, sender_id, content, message_type)
  VALUES (p_room_id, auth.uid(), '단체 영상 방이 열렸어요.', 'system');
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_group_call(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_group_call(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_room_members
    WHERE room_id = p_room_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '방 멤버 아님';
  END IF;

  UPDATE public.chat_rooms
  SET live_video_started_at = NULL
  WHERE id = p_room_id AND type <> '1on1';

  INSERT INTO public.messages(room_id, sender_id, content, message_type)
  VALUES (p_room_id, auth.uid(), '단체 영상 방이 종료됐어요.', 'system');
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_group_call(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.lightning_meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  title text NOT NULL,
  place_label text NOT NULL,
  place_lat double precision,
  place_lng double precision,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lightning_meetup_invitees (
  meetup_id uuid NOT NULL REFERENCES public.lightning_meetups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  PRIMARY KEY (meetup_id, user_id)
);

ALTER TABLE public.lightning_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightning_meetup_invitees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lightning_meetups member read" ON public.lightning_meetups;
CREATE POLICY "lightning_meetups member read" ON public.lightning_meetups
  FOR SELECT USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lightning_meetup_invitees i
      WHERE i.meetup_id = lightning_meetups.id AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lightning_meetups host insert" ON public.lightning_meetups;
CREATE POLICY "lightning_meetups host insert" ON public.lightning_meetups
  FOR INSERT WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "lightning_meetup_invitees member read" ON public.lightning_meetup_invitees;
CREATE POLICY "lightning_meetup_invitees member read" ON public.lightning_meetup_invitees
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.lightning_meetups m
      WHERE m.id = lightning_meetup_invitees.meetup_id AND m.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lightning_meetup_invitees host insert" ON public.lightning_meetup_invitees;
CREATE POLICY "lightning_meetup_invitees host insert" ON public.lightning_meetup_invitees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lightning_meetups m
      WHERE m.id = lightning_meetup_invitees.meetup_id AND m.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lightning_meetup_invitees self update" ON public.lightning_meetup_invitees;
CREATE POLICY "lightning_meetup_invitees self update" ON public.lightning_meetup_invitees
  FOR UPDATE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_lightning_meetup(
  p_title text,
  p_place_label text,
  p_lat double precision,
  p_lng double precision,
  p_scheduled_at timestamptz,
  p_invitee_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me uuid := auth.uid();
  room uuid;
  meetup uuid;
  invitee uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;

  room := public.create_group_chat_room(
    coalesce(p_invitee_ids, ARRAY[]::uuid[]),
    coalesce(nullif(trim(p_title), ''), '번개 약속'),
    '⚡'
  );

  INSERT INTO public.lightning_meetups(host_id, room_id, title, place_label, place_lat, place_lng, scheduled_at)
  VALUES (
    me,
    room,
    coalesce(nullif(trim(p_title), ''), '번개 약속'),
    coalesce(nullif(trim(p_place_label), ''), '만날 장소'),
    p_lat,
    p_lng,
    p_scheduled_at
  )
  RETURNING id INTO meetup;

  FOREACH invitee IN ARRAY coalesce(p_invitee_ids, ARRAY[]::uuid[]) LOOP
    IF invitee IS NOT NULL AND invitee <> me THEN
      INSERT INTO public.lightning_meetup_invitees(meetup_id, user_id)
      VALUES (meetup, invitee)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.messages(room_id, sender_id, content, message_type, payload)
  VALUES (
    room,
    me,
    '⚡ 번개 약속이 만들어졌어요.',
    'system',
    jsonb_build_object('meetup_id', meetup, 'place_label', p_place_label, 'scheduled_at', p_scheduled_at)
  );

  RETURN room;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lightning_meetup(text, text, double precision, double precision, timestamptz, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_lightning_meetup(p_meetup_id uuid, p_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION '잘못된 응답입니다.';
  END IF;

  UPDATE public.lightning_meetup_invitees
  SET response = p_response, responded_at = now()
  WHERE meetup_id = p_meetup_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_lightning_meetup(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
