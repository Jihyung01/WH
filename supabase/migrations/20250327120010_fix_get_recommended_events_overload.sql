-- Merge duplicate get_recommended_events overloads into a single function with default limit.
SET search_path = public, extensions;

DROP FUNCTION IF EXISTS public.get_recommended_events(uuid, double precision, double precision);
DROP FUNCTION IF EXISTS public.get_recommended_events(uuid, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION public.get_recommended_events(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_limit integer DEFAULT 15
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
    e.time_limit_minutes, e.reward_xp, e.creator_type,
    e.partner_name, e.is_active, e.is_seasonal, e.season_id,
    e.created_at, e.expires_at,
    st_y(e.location::geometry) AS lat,
    st_x(e.location::geometry) AS lng,
    st_distance(
      e.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM public.events e
  WHERE e.is_active = true
    AND (e.expires_at IS NULL OR e.expires_at > now())
    AND NOT EXISTS (
      SELECT 1 FROM public.event_completions ec
      WHERE ec.event_id = e.id AND ec.user_id = p_user_id
    )
  ORDER BY distance_meters
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_recommended_events(uuid, double precision, double precision, integer) TO authenticated, service_role;
