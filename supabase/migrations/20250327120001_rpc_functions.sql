-- WhereHere: RPC functions used by the Expo client (lib/api.ts)
-- Depends on: 20250327120000_wherehere_schema.sql

SET search_path = public, extensions;

--------------------------------------------------------------------------------
-- 1. get_nearby_events — 반경 검색 (PostGIS)
--------------------------------------------------------------------------------

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

--------------------------------------------------------------------------------
-- 2. get_event_missions — 미션 목록 + 유저 완료 여부
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_event_missions(
  p_user_id uuid,
  p_event_id uuid
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  step_order integer,
  mission_type public.mission_type,
  title text,
  description text,
  config jsonb,
  required boolean,
  created_at timestamptz,
  is_completed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.event_id, m.step_order, m.mission_type,
    m.title, m.description, m.config, m.required,
    m.created_at,
    EXISTS (
      SELECT 1 FROM public.mission_completions mc
      WHERE mc.mission_id = m.id AND mc.user_id = p_user_id
    ) AS is_completed
  FROM public.missions m
  WHERE m.event_id = p_event_id
  ORDER BY m.step_order;
$$;

--------------------------------------------------------------------------------
-- 3. verify_and_create_checkin — GPS 체크인 검증 + 생성
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_and_create_checkin(
  p_user_id uuid,
  p_event_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event_loc geography;
  v_checkin_loc geography;
  v_distance double precision;
  v_radius double precision := 100; -- meters
  v_checkin_id uuid;
BEGIN
  SELECT location INTO v_event_loc
  FROM public.events
  WHERE id = p_event_id AND is_active = true;

  IF v_event_loc IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', 0,
      'message', '이벤트를 찾을 수 없습니다.',
      'checkin_id', null
    );
  END IF;

  v_checkin_loc := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_distance := st_distance(v_event_loc, v_checkin_loc);

  IF v_distance > v_radius THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', round(v_distance::numeric, 1),
      'message', format('이벤트 장소에서 %sm 떨어져 있습니다. %sm 이내로 이동해주세요.', round(v_distance::numeric, 0), v_radius),
      'checkin_id', null
    );
  END IF;

  INSERT INTO public.checkins (user_id, event_id, location, verified)
  VALUES (p_user_id, p_event_id, v_checkin_loc, true)
  RETURNING id INTO v_checkin_id;

  RETURN jsonb_build_object(
    'success', true,
    'distance_meters', round(v_distance::numeric, 1),
    'message', '체크인 성공!',
    'checkin_id', v_checkin_id
  );
END;
$$;

--------------------------------------------------------------------------------
-- 4. get_recommended_events — 미완료 이벤트 중 가까운 순
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_recommended_events(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision
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
  LIMIT 10;
$$;

--------------------------------------------------------------------------------
-- 5. get_user_stats — 유저 종합 통계
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_stats(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_events_completed bigint;
  v_missions_completed bigint;
  v_checkins_count bigint;
  v_badges_count bigint;
  v_districts text[];
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  SELECT count(*) INTO v_events_completed
  FROM public.event_completions WHERE user_id = p_user_id;

  SELECT count(*) INTO v_missions_completed
  FROM public.mission_completions WHERE user_id = p_user_id;

  SELECT count(*) INTO v_checkins_count
  FROM public.checkins WHERE user_id = p_user_id AND verified = true;

  SELECT count(*) INTO v_badges_count
  FROM public.user_badges WHERE user_id = p_user_id;

  SELECT array_agg(DISTINCT e.district) INTO v_districts
  FROM public.event_completions ec
  JOIN public.events e ON e.id = ec.event_id
  WHERE ec.user_id = p_user_id AND e.district IS NOT NULL;

  RETURN jsonb_build_object(
    'total_xp', v_profile.total_xp,
    'level', v_profile.level,
    'login_streak', v_profile.login_streak,
    'events_completed', v_events_completed,
    'missions_completed', v_missions_completed,
    'checkins_count', v_checkins_count,
    'badges_count', v_badges_count,
    'districts_visited', COALESCE(to_jsonb(v_districts), '[]'::jsonb)
  );
END;
$$;

--------------------------------------------------------------------------------
-- 6. get_weekly_leaderboard
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  p_district text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  weekly_xp bigint,
  rank integer,
  district text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lb.user_id,
    lb.username,
    lb.avatar_url,
    lb.weekly_xp,
    lb.rank,
    lb.district
  FROM public.leaderboard_weekly lb
  WHERE lb.week_start = date_trunc('week', CURRENT_DATE)::date
    AND (p_district IS NULL OR lb.district = p_district)
  ORDER BY lb.rank
  LIMIT 100;
$$;

--------------------------------------------------------------------------------
-- 7. get_visited_locations — 완료한 이벤트 위치 + 메타
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_visited_locations(
  p_user_id uuid
)
RETURNS TABLE (
  event_id uuid,
  title text,
  district text,
  category public.event_category,
  lat double precision,
  lng double precision,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    e.id AS event_id,
    e.title,
    e.district,
    e.category,
    st_y(e.location::geometry) AS lat,
    st_x(e.location::geometry) AS lng,
    ec.completed_at
  FROM public.event_completions ec
  JOIN public.events e ON e.id = ec.event_id
  WHERE ec.user_id = p_user_id
  ORDER BY ec.completed_at DESC;
$$;

--------------------------------------------------------------------------------
-- GRANTS for RPC functions
--------------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_nearby_events(double precision, double precision, double precision, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_missions(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_create_checkin(uuid, uuid, double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_recommended_events(uuid, double precision, double precision) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_visited_locations(uuid) TO authenticated, service_role;
