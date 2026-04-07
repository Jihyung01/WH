-- App Store Review: UGC moderation (Guideline 1.2) + community terms on profiles

SET search_path = public;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_terms_version text,
  ADD COLUMN IF NOT EXISTS community_terms_accepted_at timestamptz;

--------------------------------------------------------------------------------
-- user_blocks: blocker instantly hides blocked user's UGC in client + server record
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_blocks_select_own
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY user_blocks_insert_own
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY user_blocks_delete_own
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;

--------------------------------------------------------------------------------
-- content_reports: flag objectionable UGC (developer reviews in Supabase dashboard)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('event', 'journal', 'chat', 'profile', 'other')),
  content_id uuid,
  reported_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'action_taken', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports (status);
CREATE INDEX IF NOT EXISTS content_reports_created_idx ON public.content_reports (created_at DESC);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_reports_insert_authenticated
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY content_reports_select_own
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;

--------------------------------------------------------------------------------
-- RPC: block user (insert + idempotent)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_user(p_blocked_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_blocked_user_id = v_me THEN
    RAISE EXCEPTION 'cannot block self';
  END IF;
  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_me, p_blocked_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

--------------------------------------------------------------------------------
-- Include creator_id in nearby events (for UGC report/block UI)
--------------------------------------------------------------------------------
-- RETURNS TABLE 컬럼이 바뀌면 CREATE OR REPLACE만으로는 갱신 불가 (42P13).
DROP FUNCTION IF EXISTS public.get_nearby_events(double precision, double precision, double precision, text);

CREATE OR REPLACE FUNCTION public.get_nearby_events(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 2,
  category_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  narrative text,
  address text,
  district text,
  category public.event_category,
  difficulty smallint,
  time_limit_minutes integer,
  reward_xp integer,
  creator_type text,
  creator_id uuid,
  partner_name text,
  is_active boolean,
  is_seasonal boolean,
  season_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  lat double precision,
  lng double precision,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    e.id, e.title, e.description, e.narrative,
    e.address, e.district, e.category, e.difficulty,
    e.time_limit_minutes, e.reward_xp, e.creator_type, e.creator_id,
    e.partner_name, e.is_active, e.is_seasonal, e.season_id,
    e.created_at, e.expires_at,
    st_y(e.location::geometry) AS lat,
    st_x(e.location::geometry) AS lng,
    st_distance(
      e.location,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
  FROM public.events e
  WHERE e.is_active = true
    AND (e.expires_at IS NULL OR e.expires_at > now())
    AND st_dwithin(
          e.location,
          st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
          radius_km * 1000
        )
    AND (category_filter IS NULL OR e.category::text = category_filter)
  ORDER BY distance_meters;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_events(double precision, double precision, double precision, text) TO authenticated, service_role;
