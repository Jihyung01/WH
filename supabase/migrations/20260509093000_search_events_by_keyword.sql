SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS events_title_trgm_idx
  ON public.events USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS events_address_trgm_idx
  ON public.events USING gin (address gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_events_by_keyword(
  p_query text,
  p_limit integer DEFAULT 10
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
    e.id,
    e.title,
    e.description,
    e.narrative,
    e.address,
    e.district,
    e.category,
    e.difficulty,
    e.time_limit_minutes,
    e.reward_xp,
    e.creator_type,
    e.creator_id,
    e.partner_name,
    e.is_active,
    e.is_seasonal,
    e.season_id,
    e.created_at,
    e.expires_at,
    e.visibility_conditions,
    st_y(e.location::geometry) AS lat,
    st_x(e.location::geometry) AS lng,
    0::double precision AS distance_meters
  FROM public.events e
  WHERE length(trim(coalesce(p_query, ''))) >= 2
    AND e.is_active = true
    AND (e.status IS NULL OR e.status = 'approved')
    AND (e.expires_at IS NULL OR e.expires_at > now())
    AND (
      e.title ILIKE '%' || trim(p_query) || '%'
      OR coalesce(e.address, '') ILIKE '%' || trim(p_query) || '%'
      OR coalesce(e.district, '') ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY
    greatest(
      similarity(e.title, trim(p_query)),
      similarity(coalesce(e.address, ''), trim(p_query)),
      similarity(coalesce(e.district, ''), trim(p_query))
    ) DESC,
    e.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

GRANT EXECUTE ON FUNCTION public.search_events_by_keyword(text, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
