-- Community media feed: mission proof photos + UGC event cover images (public discovery feed + DB visibility)
SET search_path = public, extensions;

-- Cover image on user-created events (shown in lists / detail when present)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public.events.cover_image_url IS 'Optional hero image for UGC events; stored in mission-photos bucket under ugc-covers/';

-- Feed / moderation surface: one row per published image
CREATE TABLE IF NOT EXISTS public.community_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  submission_type text NOT NULL CHECK (submission_type IN ('mission_photo', 'ugc_event_cover')),
  mission_completion_id uuid REFERENCES public.mission_completions (id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_submissions_mission_photo_requires_mc CHECK (
    submission_type <> 'mission_photo' OR mission_completion_id IS NOT NULL
  ),
  CONSTRAINT community_submissions_ugc_requires_event CHECK (
    submission_type <> 'ugc_event_cover' OR event_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS community_submissions_created_idx
  ON public.community_submissions (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS community_submissions_one_per_mission_completion
  ON public.community_submissions (mission_completion_id)
  WHERE mission_completion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS community_submissions_one_ugc_cover_per_event
  ON public.community_submissions (event_id)
  WHERE submission_type = 'ugc_event_cover';

ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;

-- Block direct client reads/writes; use RPCs only.
REVOKE ALL ON public.community_submissions FROM PUBLIC;
REVOKE ALL ON public.community_submissions FROM anon, authenticated;

-- Mission photo: after mission_completions row exists (same image_url as proof_url expected)
CREATE OR REPLACE FUNCTION public.create_community_submission_mission_photo(
  p_mission_completion_id uuid,
  p_image_url text,
  p_visibility text DEFAULT 'public'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.mission_completions%ROWTYPE;
  v_id uuid;
  v_vis text := coalesce(nullif(trim(p_visibility), ''), 'public');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_mission_completion_id IS NULL OR p_image_url IS NULL OR length(trim(p_image_url)) < 8 THEN
    RAISE EXCEPTION 'invalid payload';
  END IF;
  IF v_vis NOT IN ('public', 'friends', 'private') THEN
    RAISE EXCEPTION 'invalid visibility';
  END IF;

  SELECT * INTO v_row FROM public.mission_completions mc
  WHERE mc.id = p_mission_completion_id AND mc.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission completion not found';
  END IF;

  DELETE FROM public.community_submissions
  WHERE mission_completion_id = v_row.id;

  INSERT INTO public.community_submissions (
    user_id, submission_type, mission_completion_id, mission_id, event_id, image_url, visibility
  ) VALUES (
    v_uid, 'mission_photo', v_row.id, v_row.mission_id, v_row.event_id, trim(p_image_url), v_vis
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_submission_mission_photo(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_submission_mission_photo(uuid, text, text) TO authenticated;

-- UGC event cover + feed row: inserted by Edge Function `generate-ugc-event` (service role) on save.

-- Public feed (visibility = public only for now — friends/private reserved for future)
CREATE OR REPLACE FUNCTION public.get_community_feed(p_limit int DEFAULT 40)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'user_id', x.user_id,
        'username', x.username,
        'submission_type', x.submission_type,
        'image_url', x.image_url,
        'event_id', x.event_id,
        'event_title', x.event_title,
        'created_at', x.created_at
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      cs.id,
      cs.user_id,
      p.username,
      cs.submission_type,
      cs.image_url,
      cs.event_id,
      e.title AS event_title,
      cs.created_at
    FROM public.community_submissions cs
    JOIN public.profiles p ON p.id = cs.user_id
    LEFT JOIN public.events e ON e.id = cs.event_id
    WHERE cs.visibility = 'public'
    ORDER BY cs.created_at DESC
    LIMIT least(greatest(coalesce(p_limit, 40), 1), 100)
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_community_feed(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_feed(int) TO authenticated;
