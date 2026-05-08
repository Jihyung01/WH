-- Phase 6 — 장소 메모리 + 탐험 일기장 (Spec §5.2, §5.3)
--
-- 두 테이블이 공유하는 RLS 패턴:
--   public  : 누구나 읽기, 본인만 쓰기
--   friends : 친구만 읽기 (friends 또는 friend_locations 테이블 기반 EXISTS)
--   private : 본인만 읽기/쓰기
--
-- 사진은 새 storage 버킷 (place-memories, diary-photos) 에 업로드.

-- ========================================
-- Storage buckets (idempotent)
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('place-memories', 'place-memories', true, 8388608,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('diary-photos', 'diary-photos', true, 8388608,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 장소 메모리 (Place Memory)
-- ========================================

CREATE TABLE IF NOT EXISTS public.place_memories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  -- place_id 가 null 이면 free-form: lat/lng 만 저장
  lat          double precision,
  lng          double precision,
  location     geography(Point, 4326),
  photo_url    text,
  emoji        text,
  title        text NOT NULL,
  memory_date  date NOT NULL DEFAULT CURRENT_DATE,
  with_friends uuid[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS place_memories_user_idx
  ON public.place_memories(user_id, memory_date DESC);
CREATE INDEX IF NOT EXISTS place_memories_location_gix
  ON public.place_memories USING GIST(location);

ALTER TABLE public.place_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "place_memories self read" ON public.place_memories;
CREATE POLICY "place_memories self read" ON public.place_memories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_memories self write" ON public.place_memories;
CREATE POLICY "place_memories self write" ON public.place_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_memories self update" ON public.place_memories;
CREATE POLICY "place_memories self update" ON public.place_memories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_memories self delete" ON public.place_memories;
CREATE POLICY "place_memories self delete" ON public.place_memories
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 탐험 일기장 (Diary)
-- ========================================

CREATE TYPE IF NOT EXISTS diary_visibility AS ENUM ('public', 'friends', 'private');

CREATE TABLE IF NOT EXISTS public.diaries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  body          text NOT NULL,
  place_id      uuid REFERENCES public.events(id) ON DELETE SET NULL,
  place_label   text, -- 자유 입력 가능 ("정자동·4곳" 같은 요약 라벨)
  with_friends  uuid[] NOT NULL DEFAULT '{}',
  visibility    diary_visibility NOT NULL DEFAULT 'private',
  likes_count   int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  photo_urls    text[] NOT NULL DEFAULT '{}',
  diary_date    date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diaries_user_idx
  ON public.diaries(user_id, diary_date DESC);
CREATE INDEX IF NOT EXISTS diaries_visibility_idx
  ON public.diaries(visibility, diary_date DESC);

ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;

-- 본인은 항상 자기 일기 모두 read/write/update/delete 가능
DROP POLICY IF EXISTS "diaries self all" ON public.diaries;
CREATE POLICY "diaries self all" ON public.diaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 다른 사용자: visibility 에 따라 read 만
-- public: 누구나
-- friends: 친구만 (friends 테이블 기준)
-- private: 본인만 (이미 self all 에서 처리됨)
DROP POLICY IF EXISTS "diaries public read" ON public.diaries;
CREATE POLICY "diaries public read" ON public.diaries
  FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS "diaries friends read" ON public.diaries;
CREATE POLICY "diaries friends read" ON public.diaries
  FOR SELECT USING (
    visibility = 'friends'
    AND auth.uid() IS NOT NULL
    AND (
      -- friend_locations 테이블이 친구 관계의 source-of-truth (양쪽 다 INSERT 됨)
      EXISTS (
        SELECT 1 FROM public.friend_locations fl
        WHERE fl.user_id = diaries.user_id AND fl.friend_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.friend_locations fl
        WHERE fl.user_id = auth.uid() AND fl.friend_id = diaries.user_id
      )
    )
  );

-- updated_at 자동 갱신 trigger
CREATE OR REPLACE FUNCTION public.set_diary_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diaries_set_updated_at ON public.diaries;
CREATE TRIGGER diaries_set_updated_at
  BEFORE UPDATE ON public.diaries
  FOR EACH ROW EXECUTE FUNCTION public.set_diary_updated_at();

-- ========================================
-- 일기 좋아요 / 댓글
-- ========================================

CREATE TABLE IF NOT EXISTS public.diary_likes (
  diary_id  uuid NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (diary_id, user_id)
);

ALTER TABLE public.diary_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diary_likes self all" ON public.diary_likes;
CREATE POLICY "diary_likes self all" ON public.diary_likes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "diary_likes public read" ON public.diary_likes;
CREATE POLICY "diary_likes public read" ON public.diary_likes
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.diary_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id   uuid NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diary_comments_diary_idx
  ON public.diary_comments(diary_id, created_at);

ALTER TABLE public.diary_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diary_comments self write" ON public.diary_comments;
CREATE POLICY "diary_comments self write" ON public.diary_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "diary_comments self update" ON public.diary_comments;
CREATE POLICY "diary_comments self update" ON public.diary_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "diary_comments self delete" ON public.diary_comments;
CREATE POLICY "diary_comments self delete" ON public.diary_comments
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "diary_comments diary read" ON public.diary_comments;
CREATE POLICY "diary_comments diary read" ON public.diary_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diaries d
      WHERE d.id = diary_comments.diary_id
        AND (
          d.visibility = 'public'
          OR (d.visibility = 'friends' AND EXISTS (
            SELECT 1 FROM public.friend_locations fl
            WHERE (fl.user_id = d.user_id AND fl.friend_id = auth.uid())
               OR (fl.user_id = auth.uid() AND fl.friend_id = d.user_id)
          ))
          OR d.user_id = auth.uid()
        )
    )
  );

-- ========================================
-- RPC: list_my_place_memories
-- ========================================

CREATE OR REPLACE FUNCTION public.list_my_place_memories(p_limit int DEFAULT 50)
RETURNS TABLE (
  id           uuid,
  place_id     uuid,
  lat          double precision,
  lng          double precision,
  photo_url    text,
  emoji        text,
  title        text,
  memory_date  date,
  with_friends uuid[],
  created_at   timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT id, place_id, lat, lng, photo_url, emoji, title, memory_date, with_friends, created_at
  FROM public.place_memories
  WHERE user_id = auth.uid()
  ORDER BY memory_date DESC, created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_place_memories(int) TO authenticated;

-- ========================================
-- RPC: create_place_memory
-- ========================================

CREATE OR REPLACE FUNCTION public.create_place_memory(
  p_title       text,
  p_emoji       text DEFAULT NULL,
  p_photo_url   text DEFAULT NULL,
  p_lat         double precision DEFAULT NULL,
  p_lng         double precision DEFAULT NULL,
  p_place_id    uuid DEFAULT NULL,
  p_with_friends uuid[] DEFAULT '{}',
  p_memory_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.place_memories (
    user_id, place_id, lat, lng, location, photo_url, emoji, title, memory_date, with_friends
  ) VALUES (
    auth.uid(),
    p_place_id,
    p_lat,
    p_lng,
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ELSE NULL
    END,
    p_photo_url,
    p_emoji,
    p_title,
    COALESCE(p_memory_date, CURRENT_DATE),
    p_with_friends
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_place_memory(text, text, text, double precision, double precision, uuid, uuid[], date) TO authenticated;

-- ========================================
-- RPC: list_my_diaries
-- ========================================

CREATE OR REPLACE FUNCTION public.list_my_diaries(p_limit int DEFAULT 30)
RETURNS TABLE (
  id            uuid,
  title         text,
  body          text,
  place_id      uuid,
  place_label   text,
  with_friends  uuid[],
  visibility    diary_visibility,
  likes_count   int,
  comments_count int,
  photo_urls    text[],
  diary_date    date,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT id, title, body, place_id, place_label, with_friends, visibility,
         likes_count, comments_count, photo_urls, diary_date, created_at
  FROM public.diaries
  WHERE user_id = auth.uid()
  ORDER BY diary_date DESC, created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_diaries(int) TO authenticated;

-- ========================================
-- RPC: create_diary
-- ========================================

CREATE OR REPLACE FUNCTION public.create_diary(
  p_title        text,
  p_body         text,
  p_visibility   diary_visibility DEFAULT 'private',
  p_place_id     uuid DEFAULT NULL,
  p_place_label  text DEFAULT NULL,
  p_with_friends uuid[] DEFAULT '{}',
  p_photo_urls   text[] DEFAULT '{}',
  p_diary_date   date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.diaries (
    user_id, title, body, visibility, place_id, place_label, with_friends, photo_urls, diary_date
  ) VALUES (
    auth.uid(), p_title, p_body, p_visibility, p_place_id, p_place_label, p_with_friends, p_photo_urls,
    COALESCE(p_diary_date, CURRENT_DATE)
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_diary(text, text, diary_visibility, uuid, text, uuid[], text[], date) TO authenticated;

-- ========================================
-- RPC: update_diary_visibility
-- ========================================

CREATE OR REPLACE FUNCTION public.update_diary_visibility(p_diary_id uuid, p_visibility diary_visibility)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE public.diaries
  SET visibility = p_visibility
  WHERE id = p_diary_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_diary_visibility(uuid, diary_visibility) TO authenticated;

-- ========================================
-- RPC: toggle_diary_like
-- ========================================

CREATE OR REPLACE FUNCTION public.toggle_diary_like(p_diary_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  liked boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.diary_likes
    WHERE diary_id = p_diary_id AND user_id = auth.uid()
  ) THEN
    DELETE FROM public.diary_likes
    WHERE diary_id = p_diary_id AND user_id = auth.uid();
    UPDATE public.diaries SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = p_diary_id;
    liked := false;
  ELSE
    INSERT INTO public.diary_likes (diary_id, user_id) VALUES (p_diary_id, auth.uid());
    UPDATE public.diaries SET likes_count = likes_count + 1
      WHERE id = p_diary_id;
    liked := true;
  END IF;
  RETURN liked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_diary_like(uuid) TO authenticated;

-- ========================================
-- RPC: get_explore_summary  (Spec §5.4 — 4 KPI)
-- ========================================

CREATE OR REPLACE FUNCTION public.get_explore_summary()
RETURNS TABLE (
  places_visited     int,
  cities_visited     int,
  records_count      int,
  collectibles_count int
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    -- 탐험 장소 = 본인이 한 unique 이벤트 카운트
    (SELECT COUNT(DISTINCT event_id)::int FROM public.event_completions WHERE user_id = auth.uid()),
    -- 도시 = 본인 character 의 favorite_district 들 (느슨한 추정 — 별도 테이블이 없어서 임시)
    (SELECT COUNT(DISTINCT favorite_district)::int FROM public.characters WHERE user_id = auth.uid() AND favorite_district IS NOT NULL),
    -- 기록 = 일기 + 메모리 + 마크 합계
    (
      (SELECT COUNT(*)::int FROM public.diaries WHERE user_id = auth.uid()) +
      (SELECT COUNT(*)::int FROM public.place_memories WHERE user_id = auth.uid()) +
      (SELECT COUNT(*)::int FROM public.community_submissions WHERE user_id = auth.uid())
    ),
    -- 수집품 = 보유 cosmetic + 보유 칭호
    (
      (SELECT COUNT(*)::int FROM public.user_cosmetics WHERE user_id = auth.uid()) +
      (SELECT COUNT(*)::int FROM public.user_titles WHERE user_id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_explore_summary() TO authenticated;
