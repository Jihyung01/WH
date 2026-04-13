SET search_path = public, extensions;

-- Expose visibility_conditions for client-side conditional markers / filtering
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
  visibility_conditions jsonb,
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
    e.created_at, e.expires_at, e.visibility_conditions,
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
