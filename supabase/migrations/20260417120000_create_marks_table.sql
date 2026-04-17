-- ============================================
-- Description: "?붿쟻(Mark)" ?뚯씠釉??좎꽕 ???꾩튂 湲곕컲 寃쎈웾 ?숈꽌 肄섑뀗痢?-- Breaking: no (?좉퇋 ?뚯씠釉?異붽?留?
-- Dependencies: profiles, user_blocks, friendships (?대? 議댁옱)
-- Rollback: DROP TABLE public.marks CASCADE; DROP FUNCTION public.marks_set_updated_at();
-- ============================================

SET search_path = public, extensions;

BEGIN;

-- 1. marks ?뚯씠釉?CREATE TABLE IF NOT EXISTS public.marks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content      text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 200),
  photo_url    text NOT NULL CHECK (char_length(btrim(photo_url)) >= 8),
  location     geography(Point, 4326) NOT NULL,
  district     text,
  music_json   jsonb DEFAULT NULL,
  visibility   text NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('public', 'friends', 'private')),
  expires_at   timestamptz,
  xp_granted   integer NOT NULL DEFAULT 2 CHECK (xp_granted >= 0),
  emoji_icon   text NOT NULL DEFAULT '?뱧' CHECK (char_length(emoji_icon) BETWEEN 1 AND 16),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.marks IS '?붿쟻(Mark) ???꾩튂 湲곕컲 寃쎈웾 ?숈꽌. ?대깽?몄? ?щ━ 誘몄뀡 ?놁쓬.';
COMMENT ON COLUMN public.marks.music_json IS 'Apple Music 移댄깉濡쒓렇 泥⑤? (community_submissions.music_json怨??숈씪 ?щ㎎)';
COMMENT ON COLUMN public.marks.expires_at IS 'NULL?대㈃ ?곴뎄 蹂댁〈, 媛믪씠 ?덉쑝硫??대떦 ?쒓컖 ?댄썑 ?먮룞 留뚮즺';

-- 2. ?몃뜳??CREATE INDEX IF NOT EXISTS marks_location_gix
  ON public.marks USING gist (location);

CREATE INDEX IF NOT EXISTS marks_user_created_idx
  ON public.marks (user_id, created_at DESC);

-- ?쒖꽦(留뚮즺?섏? ?딆?) ?붿쟻 議고쉶??partial index
CREATE INDEX IF NOT EXISTS marks_active_created_idx
  ON public.marks (created_at DESC)
  WHERE expires_at IS NULL OR expires_at > now();

CREATE INDEX IF NOT EXISTS marks_visibility_idx
  ON public.marks (visibility);

CREATE INDEX IF NOT EXISTS marks_district_idx
  ON public.marks (district);

-- 3. updated_at ?먮룞 媛깆떊 ?몃━嫄?CREATE TRIGGER marks_set_updated_at
  BEFORE UPDATE ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS ?쒖꽦??ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 5. RLS ?뺤콉
-- 5.1 SELECT: 怨듦컻/移쒓뎄/鍮꾧났媛?+ 李⑤떒 ?좎? ?꾪꽣
DROP POLICY IF EXISTS marks_select_visibility ON public.marks;
CREATE POLICY marks_select_visibility
  ON public.marks
  FOR SELECT
  TO authenticated
  USING (
    -- 留뚮즺???붿쟻 ?쒖쇅
    (expires_at IS NULL OR expires_at > now())
    AND (
      -- 蹂몄씤 ?붿쟻? ??긽 ?대엺 媛??      auth.uid() = user_id
      OR (
        -- ?곹샇 李⑤떒 愿怨꾧? ?꾨떂
        NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub
          WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id  = public.marks.user_id)
             OR (ub.blocker_id = public.marks.user_id  AND ub.blocked_id = auth.uid())
        )
        AND (
          -- 怨듦컻
          visibility = 'public'
          OR (
            -- 移쒓뎄留? ?섎씫??移쒓뎄 愿怨?議댁옱 ??            visibility = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = auth.uid() AND f.addressee_id = public.marks.user_id)
                  OR (f.requester_id = public.marks.user_id AND f.addressee_id = auth.uid())
                )
            )
          )
        )
      )
    )
  );

-- 5.2 INSERT: 蹂몄씤 user_id濡쒕쭔
DROP POLICY IF EXISTS marks_insert_own ON public.marks;
CREATE POLICY marks_insert_own
  ON public.marks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5.3 UPDATE: 蹂몄씤留? (而щ읆 ?⑥쐞 ?쒖빟? RPC濡?媛뺤젣 ??content/visibility/expires_at留?蹂寃?媛??
DROP POLICY IF EXISTS marks_update_own ON public.marks;
CREATE POLICY marks_update_own
  ON public.marks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5.4 DELETE: 蹂몄씤留?DROP POLICY IF EXISTS marks_delete_own ON public.marks;
CREATE POLICY marks_delete_own
  ON public.marks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. 沅뚰븳 (authenticated). anon? ?묎렐 遺덇?
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;

COMMIT;

-- ============================================
-- ROLLBACK (?섎룞 ?ㅽ뻾??
-- ============================================
-- BEGIN;
-- DROP POLICY IF EXISTS marks_select_visibility ON public.marks;
-- DROP POLICY IF EXISTS marks_insert_own        ON public.marks;
-- DROP POLICY IF EXISTS marks_update_own        ON public.marks;
-- DROP POLICY IF EXISTS marks_delete_own        ON public.marks;
-- DROP TABLE IF EXISTS public.marks CASCADE;
-- COMMIT;
