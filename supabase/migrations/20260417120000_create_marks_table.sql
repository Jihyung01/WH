-- ============================================
-- Description: "Mark" table for lightweight map notes
-- Breaking: no (new table only)
-- Dependencies: profiles, user_blocks, friendships
-- Rollback: DROP TABLE public.marks CASCADE;
-- ============================================

SET search_path = public, extensions;

BEGIN;

-- 1. marks table
CREATE TABLE IF NOT EXISTS public.marks (
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
  emoji_icon   text NOT NULL DEFAULT '📍' CHECK (char_length(emoji_icon) BETWEEN 1 AND 16),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marks IS 'Mark: lightweight location-based note.';
COMMENT ON COLUMN public.marks.music_json IS 'Apple Music payload format (same as community_submissions.music_json).';
COMMENT ON COLUMN public.marks.expires_at IS 'NULL means permanent; non-NULL means expires at timestamp.';

-- 2. indexes
CREATE INDEX IF NOT EXISTS marks_location_gix
  ON public.marks USING gist (location);

CREATE INDEX IF NOT EXISTS marks_user_created_idx
  ON public.marks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS marks_active_created_idx
  ON public.marks (created_at DESC)
  WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS marks_expires_created_idx
  ON public.marks (expires_at, created_at DESC)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS marks_visibility_idx
  ON public.marks (visibility);

CREATE INDEX IF NOT EXISTS marks_district_idx
  ON public.marks (district);

-- 3. updated_at trigger
DROP TRIGGER IF EXISTS marks_set_updated_at ON public.marks;
CREATE TRIGGER marks_set_updated_at
  BEFORE UPDATE ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. enable RLS
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
-- 5.1 SELECT: visibility + block filtering + expiry filtering
DROP POLICY IF EXISTS marks_select_visibility ON public.marks;
CREATE POLICY marks_select_visibility
  ON public.marks
  FOR SELECT
  TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now())
    AND (
      auth.uid() = user_id
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub
          WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = public.marks.user_id)
             OR (ub.blocker_id = public.marks.user_id AND ub.blocked_id = auth.uid())
        )
        AND (
          visibility = 'public'
          OR (
            visibility = 'friends'
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

-- 5.2 INSERT: owner only
DROP POLICY IF EXISTS marks_insert_own ON public.marks;
CREATE POLICY marks_insert_own
  ON public.marks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5.3 UPDATE: owner only (mutable columns controlled via RPC)
DROP POLICY IF EXISTS marks_update_own ON public.marks;
CREATE POLICY marks_update_own
  ON public.marks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5.4 DELETE: owner only
DROP POLICY IF EXISTS marks_delete_own ON public.marks;
CREATE POLICY marks_delete_own
  ON public.marks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;

COMMIT;

-- ============================================
-- ROLLBACK (manual)
-- ============================================
-- BEGIN;
-- DROP POLICY IF EXISTS marks_select_visibility ON public.marks;
-- DROP POLICY IF EXISTS marks_insert_own        ON public.marks;
-- DROP POLICY IF EXISTS marks_update_own        ON public.marks;
-- DROP POLICY IF EXISTS marks_delete_own        ON public.marks;
-- DROP TABLE IF EXISTS public.marks CASCADE;
-- COMMIT;
