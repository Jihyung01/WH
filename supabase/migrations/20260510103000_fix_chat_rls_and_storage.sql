SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.is_chat_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_members m
    WHERE m.room_id = p_room_id
      AND m.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_room_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "chat_room_members self read" ON public.chat_room_members;
CREATE POLICY "chat_room_members self read" ON public.chat_room_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_chat_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_rooms member read" ON public.chat_rooms;
CREATE POLICY "chat_rooms member read" ON public.chat_rooms
  FOR SELECT USING (public.is_chat_room_member(id, auth.uid()));

DROP POLICY IF EXISTS "chat_rooms member update" ON public.chat_rooms;
CREATE POLICY "chat_rooms member update" ON public.chat_rooms
  FOR UPDATE USING (public.is_chat_room_member(id, auth.uid()));

DROP POLICY IF EXISTS "messages member read" ON public.messages;
CREATE POLICY "messages member read" ON public.messages
  FOR SELECT USING (public.is_chat_room_member(room_id, auth.uid()));

DROP POLICY IF EXISTS "messages self insert" ON public.messages;
CREATE POLICY "messages self insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_chat_room_member(room_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_group_chat_room(
  p_member_ids uuid[],
  p_title text,
  p_emoji text DEFAULT '👥'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.start_group_call(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_chat_room_member(p_room_id, auth.uid()) THEN
    RAISE EXCEPTION '방 멤버 아님';
  END IF;

  UPDATE public.chat_rooms
  SET live_video_started_at = now()
  WHERE id = p_room_id AND type <> '1on1';

  INSERT INTO public.messages(room_id, sender_id, content, message_type)
  VALUES (p_room_id, auth.uid(), '단체 영상 방이 열렸어요.', 'system');
END;
$$;

CREATE OR REPLACE FUNCTION public.end_group_call(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_chat_room_member(p_room_id, auth.uid()) THEN
    RAISE EXCEPTION '방 멤버 아님';
  END IF;

  UPDATE public.chat_rooms
  SET live_video_started_at = NULL
  WHERE id = p_room_id AND type <> '1on1';

  INSERT INTO public.messages(room_id, sender_id, content, message_type)
  VALUES (p_room_id, auth.uid(), '단체 영상 방이 종료됐어요.', 'system');
END;
$$;

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
SECURITY DEFINER
SET search_path = public
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

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id IN ('place-memories', 'diary-photos');

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'mission-photos'
  AND allowed_mime_types IS NOT NULL;

NOTIFY pgrst, 'reload schema';
