-- Phase 5 — 메시지 (chat) 인프라 (Spec §6).
--
-- 1:1 / 그룹 채팅. Realtime 으로 message INSERT 구독.
-- LIVE 단체영상 배너는 별도 chat_room.live_video_started_at 컬럼으로 표현 (실 video 인프라는 다음 phase).

-- ========================================
-- chat_rooms — 1:1 (자동 생성) / crew (수동) / direct group (멤버 직접 추가)
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_room_type') THEN
    CREATE TYPE chat_room_type AS ENUM ('1on1', 'group', 'crew');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        chat_room_type NOT NULL,
  title       text,                                       -- group / crew 만 사용
  emoji       text,                                       -- 그룹 아이콘
  crew_id     uuid REFERENCES public.crews(id) ON DELETE CASCADE,  -- crew 채팅
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  -- LIVE 단체영상통화 배너 표현용
  live_video_started_at timestamptz
);

CREATE INDEX IF NOT EXISTS chat_rooms_last_msg_idx
  ON public.chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_rooms_crew_idx
  ON public.chat_rooms(crew_id);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_rooms self insert" ON public.chat_rooms;
CREATE POLICY "chat_rooms self insert" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ========================================
-- chat_room_members
-- ========================================
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  room_id      uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  is_admin     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_room_members_user_idx
  ON public.chat_room_members(user_id);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_room_members self read" ON public.chat_room_members;
CREATE POLICY "chat_room_members self read" ON public.chat_room_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_room_members m2
               WHERE m2.room_id = chat_room_members.room_id AND m2.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "chat_room_members self insert" ON public.chat_room_members;
CREATE POLICY "chat_room_members self insert" ON public.chat_room_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "chat_room_members self update" ON public.chat_room_members;
CREATE POLICY "chat_room_members self update" ON public.chat_room_members
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_room_members self delete" ON public.chat_room_members;
CREATE POLICY "chat_room_members self delete" ON public.chat_room_members
  FOR DELETE USING (user_id = auth.uid());

-- 멤버만 read/update 허용 (chat_room_members 생성 후 정책 생성)
DROP POLICY IF EXISTS "chat_rooms member read" ON public.chat_rooms;
CREATE POLICY "chat_rooms member read" ON public.chat_rooms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_room_members m
            WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "chat_rooms member update" ON public.chat_rooms;
CREATE POLICY "chat_rooms member update" ON public.chat_rooms
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.chat_room_members m
            WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid())
  );

-- ========================================
-- messages
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'event_invite', 'system');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text,
  message_type message_type NOT NULL DEFAULT 'text',
  payload     jsonb,                       -- location: {lat,lng,label}; event_invite: {event_id,title,time}
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_room_idx
  ON public.messages(room_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages member read" ON public.messages;
CREATE POLICY "messages member read" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_room_members m
            WHERE m.room_id = messages.room_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages self insert" ON public.messages;
CREATE POLICY "messages self insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.chat_room_members m
                WHERE m.room_id = messages.room_id AND m.user_id = auth.uid())
  );

-- 메시지 들어올 때 chat_rooms.last_message_at 자동 업데이트
CREATE OR REPLACE FUNCTION public.bump_chat_room_last_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chat_rooms SET last_message_at = NEW.created_at WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_room ON public.messages;
CREATE TRIGGER messages_bump_room
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_chat_room_last_message();

-- ========================================
-- RPC: 1on1 room 자동 생성/조회
-- ========================================
CREATE OR REPLACE FUNCTION public.get_or_create_1on1_room(p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  me uuid := auth.uid();
  found_room uuid;
  new_room uuid;
BEGIN
  IF me IS NULL OR p_target_user_id IS NULL OR me = p_target_user_id THEN
    RAISE EXCEPTION '잘못된 사용자';
  END IF;

  -- 기존 1on1 방 검색
  SELECT cr.id INTO found_room
  FROM public.chat_rooms cr
  WHERE cr.type = '1on1'
    AND EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = cr.id AND user_id = me)
    AND EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = cr.id AND user_id = p_target_user_id)
  LIMIT 1;

  IF found_room IS NOT NULL THEN
    RETURN found_room;
  END IF;

  -- 신규 생성
  INSERT INTO public.chat_rooms(type, created_by)
  VALUES ('1on1', me)
  RETURNING id INTO new_room;

  INSERT INTO public.chat_room_members(room_id, user_id) VALUES (new_room, me);
  INSERT INTO public.chat_room_members(room_id, user_id) VALUES (new_room, p_target_user_id);

  RETURN new_room;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_1on1_room(uuid) TO authenticated;

-- ========================================
-- RPC: list_my_chat_rooms — 멤버인 모든 방 + 마지막 메시지 미리보기
-- ========================================
CREATE OR REPLACE FUNCTION public.list_my_chat_rooms(p_limit int DEFAULT 30)
RETURNS TABLE (
  room_id          uuid,
  type             chat_room_type,
  title            text,
  emoji            text,
  crew_id          uuid,
  last_message_at  timestamptz,
  live_video_started_at timestamptz,
  unread_count     int,
  member_count     int,
  last_message_text text,
  last_message_sender text
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH my_rooms AS (
    SELECT cr.*
    FROM public.chat_rooms cr
    JOIN public.chat_room_members m ON m.room_id = cr.id
    WHERE m.user_id = auth.uid()
  )
  SELECT
    cr.id AS room_id,
    cr.type,
    cr.title,
    cr.emoji,
    cr.crew_id,
    cr.last_message_at,
    cr.live_video_started_at,
    -- 미확인 카운트
    (SELECT COUNT(*)::int FROM public.messages msg
     JOIN public.chat_room_members me ON me.room_id = cr.id AND me.user_id = auth.uid()
     WHERE msg.room_id = cr.id AND msg.created_at > me.last_read_at) AS unread_count,
    (SELECT COUNT(*)::int FROM public.chat_room_members WHERE room_id = cr.id) AS member_count,
    (SELECT msg.content FROM public.messages msg WHERE msg.room_id = cr.id ORDER BY msg.created_at DESC LIMIT 1) AS last_message_text,
    (SELECT p.username FROM public.messages msg
     LEFT JOIN public.profiles p ON p.id = msg.sender_id
     WHERE msg.room_id = cr.id ORDER BY msg.created_at DESC LIMIT 1) AS last_message_sender
  FROM my_rooms cr
  ORDER BY cr.last_message_at DESC
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;
GRANT EXECUTE ON FUNCTION public.list_my_chat_rooms(int) TO authenticated;

-- ========================================
-- RPC: list_room_messages
-- ========================================
CREATE OR REPLACE FUNCTION public.list_room_messages(p_room_id uuid, p_limit int DEFAULT 80, p_before timestamptz DEFAULT NULL)
RETURNS TABLE (
  id           uuid,
  sender_id    uuid,
  sender_name  text,
  content      text,
  message_type message_type,
  payload      jsonb,
  created_at   timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT msg.id, msg.sender_id, p.username AS sender_name, msg.content, msg.message_type, msg.payload, msg.created_at
  FROM public.messages msg
  LEFT JOIN public.profiles p ON p.id = msg.sender_id
  WHERE msg.room_id = p_room_id
    AND (p_before IS NULL OR msg.created_at < p_before)
    AND EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = p_room_id AND user_id = auth.uid())
  ORDER BY msg.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;
GRANT EXECUTE ON FUNCTION public.list_room_messages(uuid, int, timestamptz) TO authenticated;

-- ========================================
-- RPC: send_message
-- ========================================
CREATE OR REPLACE FUNCTION public.send_message(
  p_room_id      uuid,
  p_content      text DEFAULT NULL,
  p_message_type message_type DEFAULT 'text',
  p_payload      jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = p_room_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION '방 멤버 아님';
  END IF;

  INSERT INTO public.messages(room_id, sender_id, content, message_type, payload)
  VALUES (p_room_id, auth.uid(), p_content, p_message_type, p_payload)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, message_type, jsonb) TO authenticated;

-- ========================================
-- RPC: mark_room_read
-- ========================================
CREATE OR REPLACE FUNCTION public.mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE public.chat_room_members
  SET last_read_at = now()
  WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_room_read(uuid) TO authenticated;

-- ========================================
-- PostgREST schema reload
-- ========================================
NOTIFY pgrst, 'reload schema';
