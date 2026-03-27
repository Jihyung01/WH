-- WhereHere: full schema migration (Supabase + PostGIS)
-- Requires: Supabase project with PostGIS available (enable via Dashboard or this file)

--------------------------------------------------------------------------------
-- EXTENSIONS
--------------------------------------------------------------------------------

-- Supabase: keep PostGIS in `extensions` schema; ensure DB search_path includes `extensions` (default on hosted).
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- So geography type and ST_* resolve in this migration without schema-qualifying every call.
SET search_path = public, extensions;

--------------------------------------------------------------------------------
-- ENUM TYPES
--------------------------------------------------------------------------------

CREATE TYPE public.event_category AS ENUM (
  'exploration',
  'photo',
  'quiz',
  'partnership'
);

CREATE TYPE public.mission_type AS ENUM (
  'gps_checkin',
  'photo',
  'quiz',
  'text',
  'timer'
);

CREATE TYPE public.badge_category AS ENUM (
  'exploration',
  'region',
  'season',
  'achievement'
);

CREATE TYPE public.rarity_level AS ENUM (
  'common',
  'rare',
  'epic',
  'legendary'
);

--------------------------------------------------------------------------------
-- UPDATED_AT HELPER
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

--------------------------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
--------------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  total_xp bigint NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  login_streak integer NOT NULL DEFAULT 0 CHECK (login_streak >= 0),
  push_token text
);

CREATE INDEX profiles_username_idx ON public.profiles (username);

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- CHARACTERS
--------------------------------------------------------------------------------

CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name IN ('도담', '나래', '하람', '별찌')),
  character_type text NOT NULL,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  evolution_stage integer NOT NULL DEFAULT 1 CHECK (evolution_stage >= 1),
  stat_exploration integer NOT NULL DEFAULT 10 CHECK (stat_exploration >= 0),
  stat_discovery integer NOT NULL DEFAULT 10 CHECK (stat_discovery >= 0),
  stat_knowledge integer NOT NULL DEFAULT 10 CHECK (stat_knowledge >= 0),
  stat_connection integer NOT NULL DEFAULT 10 CHECK (stat_connection >= 0),
  stat_creativity integer NOT NULL DEFAULT 10 CHECK (stat_creativity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX characters_user_id_idx ON public.characters (user_id);

--------------------------------------------------------------------------------
-- EVENTS
--------------------------------------------------------------------------------

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  narrative text,
  location geography(Point, 4326) NOT NULL,
  address text,
  district text,
  category public.event_category NOT NULL,
  difficulty smallint NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  time_limit_minutes integer CHECK (time_limit_minutes IS NULL OR time_limit_minutes >= 0),
  reward_xp integer NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  creator_type text NOT NULL DEFAULT 'system',
  partner_name text,
  is_active boolean NOT NULL DEFAULT true,
  is_seasonal boolean NOT NULL DEFAULT false,
  season_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX events_location_gix ON public.events USING gist (location);
CREATE INDEX events_category_idx ON public.events (category);
CREATE INDEX events_district_idx ON public.events (district);
CREATE INDEX events_is_active_expires_idx ON public.events (is_active, expires_at);

--------------------------------------------------------------------------------
-- MISSIONS
--------------------------------------------------------------------------------

CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  step_order integer NOT NULL CHECK (step_order >= 1),
  mission_type public.mission_type NOT NULL,
  title text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, step_order)
);

CREATE INDEX missions_event_id_idx ON public.missions (event_id);

--------------------------------------------------------------------------------
-- CHECKINS
--------------------------------------------------------------------------------

CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX checkins_location_gix ON public.checkins USING gist (location);
CREATE INDEX checkins_user_id_idx ON public.checkins (user_id);
CREATE INDEX checkins_event_id_idx ON public.checkins (event_id);
CREATE INDEX checkins_user_event_idx ON public.checkins (user_id, event_id);

--------------------------------------------------------------------------------
-- MISSION COMPLETIONS
--------------------------------------------------------------------------------

CREATE TABLE public.mission_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  proof_url text,
  answer text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

CREATE INDEX mission_completions_user_id_idx ON public.mission_completions (user_id);
CREATE INDEX mission_completions_event_id_idx ON public.mission_completions (event_id);

--------------------------------------------------------------------------------
-- EVENT COMPLETIONS
--------------------------------------------------------------------------------

CREATE TABLE public.event_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  rewards_earned jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX event_completions_user_id_idx ON public.event_completions (user_id);
CREATE INDEX event_completions_event_id_idx ON public.event_completions (event_id);

--------------------------------------------------------------------------------
-- BADGES
--------------------------------------------------------------------------------

CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon_url text,
  category public.badge_category NOT NULL,
  rarity public.rarity_level NOT NULL DEFAULT 'common',
  requirement_type text NOT NULL,
  requirement_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX badges_category_idx ON public.badges (category);
CREATE INDEX badges_rarity_idx ON public.badges (rarity);

--------------------------------------------------------------------------------
-- USER BADGES
--------------------------------------------------------------------------------

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges (id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX user_badges_user_id_idx ON public.user_badges (user_id);
CREATE INDEX user_badges_badge_id_idx ON public.user_badges (badge_id);

--------------------------------------------------------------------------------
-- INVENTORY ITEMS
--------------------------------------------------------------------------------

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_name text NOT NULL,
  rarity public.rarity_level NOT NULL DEFAULT 'common',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  acquired_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_items_user_id_idx ON public.inventory_items (user_id);
CREATE INDEX inventory_items_item_type_idx ON public.inventory_items (item_type);

--------------------------------------------------------------------------------
-- WEEKLY LEADERBOARD (table; refresh via Edge Function / cron + service role)
--------------------------------------------------------------------------------

CREATE TABLE public.leaderboard_weekly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  weekly_xp bigint NOT NULL DEFAULT 0 CHECK (weekly_xp >= 0),
  rank integer CHECK (rank IS NULL OR rank >= 1),
  district text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, user_id)
);

CREATE INDEX leaderboard_weekly_week_rank_idx
  ON public.leaderboard_weekly (week_start, rank);
CREATE INDEX leaderboard_weekly_week_xp_idx
  ON public.leaderboard_weekly (week_start, weekly_xp DESC);

--------------------------------------------------------------------------------
-- STARTER CHARACTER CATALOG (seed reference for the 4 순우리말 스타터)
--------------------------------------------------------------------------------

CREATE TABLE public.starter_character_catalog (
  name text PRIMARY KEY CHECK (name IN ('도담', '나래', '하람', '별찌')),
  character_type text NOT NULL,
  description text,
  stat_exploration integer NOT NULL DEFAULT 10,
  stat_discovery integer NOT NULL DEFAULT 10,
  stat_knowledge integer NOT NULL DEFAULT 10,
  stat_connection integer NOT NULL DEFAULT 10,
  stat_creativity integer NOT NULL DEFAULT 10
);

--------------------------------------------------------------------------------
-- POSTGIS: CHECK-IN PROXIMITY (100 m, geography — third arg = meters)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_checkin_within_event_radius(
  event_loc geography,
  checkin_loc geography,
  radius_meters double precision DEFAULT 100
)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = public, extensions
AS $$
  SELECT st_dwithin(event_loc, checkin_loc, radius_meters);
$$;

COMMENT ON FUNCTION public.is_checkin_within_event_radius IS
  'Returns true if check-in point is within radius_meters of event location (default 100 m). Uses ST_DWithin on geography (WGS84 / EPSG:4326).';

--------------------------------------------------------------------------------
-- AUTO-CREATE PROFILE ON SIGNUP
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'name', 'user_' || left(new.id::text, 8))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_character_catalog ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- characters
CREATE POLICY characters_all_own
  ON public.characters FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- events / missions / badges: read-only for authenticated users
CREATE POLICY events_select_authenticated
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY missions_select_authenticated
  ON public.missions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY badges_select_authenticated
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

-- checkins
CREATE POLICY checkins_select_own
  ON public.checkins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY checkins_insert_own
  ON public.checkins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY checkins_update_own
  ON public.checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- mission_completions
CREATE POLICY mission_completions_select_own
  ON public.mission_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY mission_completions_insert_own
  ON public.mission_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY mission_completions_update_own
  ON public.mission_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- event_completions
CREATE POLICY event_completions_select_own
  ON public.event_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY event_completions_insert_own
  ON public.event_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY event_completions_update_own
  ON public.event_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_badges
CREATE POLICY user_badges_select_own
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_badges_insert_own
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- inventory_items
CREATE POLICY inventory_items_all_own
  ON public.inventory_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- leaderboard_weekly
CREATE POLICY leaderboard_weekly_select_authenticated
  ON public.leaderboard_weekly FOR SELECT
  TO authenticated
  USING (true);

-- starter_character_catalog
CREATE POLICY starter_character_catalog_select_authenticated
  ON public.starter_character_catalog FOR SELECT
  TO authenticated
  USING (true);

--------------------------------------------------------------------------------
-- GRANTS (Supabase roles)
--------------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT ON public.starter_character_catalog TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.missions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mission_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_completions TO authenticated;
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT ON public.leaderboard_weekly TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_checkin_within_event_radius(geography, geography, double precision) TO authenticated, service_role;

--------------------------------------------------------------------------------
-- SEED: STARTER CHARACTERS (catalog)
--------------------------------------------------------------------------------

INSERT INTO public.starter_character_catalog (
  name, character_type, description,
  stat_exploration, stat_discovery, stat_knowledge, stat_connection, stat_creativity
) VALUES
  (
    '도담', 'pathfinder',
    '길과 지형에 강한 탐험형 스타터.',
    14, 12, 9, 10, 8
  ),
  (
    '나래', 'observer',
    '작은 발견과 디테일에 강한 관찰형 스타터.',
    10, 16, 10, 9, 8
  ),
  (
    '하람', 'scholar',
    '이야기와 지식에 강한 학습형 스타터.',
    9, 10, 16, 11, 9
  ),
  (
    '별찌', 'connector',
    '사람과 협력, 창의적 해결에 강한 연결형 스타터.',
    9, 9, 11, 14, 14
  );

--------------------------------------------------------------------------------
-- SEED: BADGES (10)
--------------------------------------------------------------------------------

INSERT INTO public.badges (name, description, category, rarity, requirement_type, requirement_value) VALUES
  ('첫 발자국', '첫 번째 이벤트를 완료했습니다.', 'achievement', 'common', 'events_completed', '{"min": 1}'),
  ('한강 산책러', '한강 인근 이벤트를 완료했습니다.', 'region', 'common', 'district_completed', '{"district": "영등포구"}'),
  ('광화문의 빛', '광화문 인근 탐험 이벤트를 완료했습니다.', 'region', 'rare', 'district_completed', '{"district": "종로구"}'),
  ('남산의 바람', '남산 인근 이벤트를 완료했습니다.', 'region', 'rare', 'district_completed', '{"district": "중구"}'),
  ('홍대의 밤', '홍대 인근 이벤트를 완료했습니다.', 'region', 'epic', 'district_completed', '{"district": "마포구"}'),
  ('강남 스프린터', '강남 인근 이벤트를 완료했습니다.', 'region', 'epic', 'district_completed', '{"district": "강남구"}'),
  ('시즌 개막', '시즌 한정 이벤트를 1회 완료했습니다.', 'season', 'rare', 'seasonal_events_completed', '{"min": 1}'),
  ('탐험가 입문', '탐험 카테고리 이벤트를 3회 완료했습니다.', 'exploration', 'common', 'category_events_completed', '{"category": "exploration", "min": 3}'),
  ('퀴즈 마스터', '퀴즈 미션을 10회 성공했습니다.', 'achievement', 'legendary', 'quiz_missions_passed', '{"min": 10}'),
  ('스마트 스냅', '사진 미션을 5회 제출했습니다.', 'achievement', 'rare', 'photo_missions_submitted', '{"min": 5}');

--------------------------------------------------------------------------------
-- SEED: EVENTS (5, 서울) + MISSIONS
-- geography: ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
--------------------------------------------------------------------------------

INSERT INTO public.events (
  title, description, narrative, location, address, district,
  category, difficulty, time_limit_minutes, reward_xp,
  creator_type, partner_name, is_active, is_seasonal, expires_at
) VALUES
  (
    '광화문 광장 탐험',
    '조선의 정문 앞 광장에서 역사와 도심 스카이라인을 만나요.',
    '오늘 바람은 궁궐의 이야기를 실어 나릅니다. 광장의 중심에 서서 도시의 숨결을 느껴보세요.',
    ST_SetSRID(ST_MakePoint(126.9768, 37.5759), 4326)::geography,
    '세종대로 172', '종로구',
    'exploration', 2, 45, 120,
    'system', NULL, true, false,
    now() + interval '365 days'
  ),
  (
    '남산 N서울타워 뷰포인트',
    '남산에서 서울 야경과 타워를 담는 포토 스팟 챌린지.',
    '높은 곳에서 바라본 불빛들이 별처럼 이어집니다. 한 장의 사진에 도시의 밤을 담아보세요.',
    ST_SetSRID(ST_MakePoint(126.9882, 37.5512), 4326)::geography,
    '남산공원길 105', '중구',
    'photo', 3, 60, 200,
    'system', NULL, true, false,
    now() + interval '365 days'
  ),
  (
    '여의도 한강공원 퀴즈 산책',
    '물길 따라 걸으며 한강과 도심에 관한 짧은 퀴즈를 풀어요.',
    '강바람이 덧칠한 퀴즈 카드가 손안에 떨어집니다. 정답을 맞히면 지식의 물줄기가 이어집니다.',
    ST_SetSRID(ST_MakePoint(126.935, 37.528), 4326)::geography,
    '여의동로 330', '영등포구',
    'quiz', 2, 40, 150,
    'system', NULL, true, true,
    now() + interval '180 days'
  ),
  (
    '홍익문화의 거리 파트너 스탬프',
    '지역 파트너 카페와 연계된 스탬프·체크인 이벤트.',
    '골목마다 다른 리듬이 흐릅니다. 파트너의 낙서 같은 초대장을 따라가 보세요.',
    ST_SetSRID(ST_MakePoint(126.9236, 37.5563), 4326)::geography,
    '어울마당로 94', '마포구',
    'partnership', 2, 30, 100,
    'partner', '홍대문화기획', true, false,
    now() + interval '90 days'
  ),
  (
    '강남역 지하·지상 연결 탐험',
    '복잡한 교차로와 보행 네트워크를 따라 미션을 순차 완료합니다.',
    '사람의 파도 속에서 방향을 읽는 법을 배웁니다. 다음 안내가 미세하게 깜빡입니다.',
    ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326)::geography,
    '강남대로 396', '강남구',
    'exploration', 4, 50, 180,
    'system', NULL, true, false,
    now() + interval '365 days'
  );

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '광장 중심 체크인', '지정 반경 안에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '광화문 광장 탐험';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'text', '한 줄 소감', '이 장소에서 떠오른 생각을 적어주세요.', '{"maxLen": 200}'::jsonb, false
FROM public.events WHERE title = '광화문 광장 탐험';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '전망대 인근 체크인', '타워가 보이는 지점에서 체크인합니다.', '{}'::jsonb, true
FROM public.events WHERE title = '남산 N서울타워 뷰포인트';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '야경 샷', '서울 야경이 담기게 촬영하세요.', '{"aspectRatio": "3:4"}'::jsonb, true
FROM public.events WHERE title = '남산 N서울타워 뷰포인트';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'quiz', '한강 퀴즈', '보기 중 정답을 고르세요.',
  '{"question": "한강은 몇 개의 주요 다리와 이어져 있나요? (앱 데모용)", "options": ["3개", "약 30개", "100개"], "correctIndex": 1}'::jsonb,
  true
FROM public.events WHERE title = '여의도 한강공원 퀴즈 산책';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'timer', '삼분 산책', '타이머가 끝날 때까지 이동하세요.', '{"seconds": 180}'::jsonb, false
FROM public.events WHERE title = '여의도 한강공원 퀴즈 산책';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '파트너 스팟 도착', '지정 스팟에서 체크인합니다.', '{}'::jsonb, true
FROM public.events WHERE title = '홍익문화의 거리 파트너 스탬프';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '거리 풍경', '홍대 거리 풍경을 담아주세요.', '{}'::jsonb, true
FROM public.events WHERE title = '홍익문화의 거리 파트너 스탬프';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '강남역 인근 체크인', '출구 근처 지정 구역에서 체크인합니다.', '{}'::jsonb, true
FROM public.events WHERE title = '강남역 지하·지상 연결 탐험';

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '교통 퀴즈', '강남 교차로와 관련된 문제입니다.',
  '{"question": "이 일대는 보행량이 많은 허브입니다. 안전한 횡단을 위해 무엇이 중요할까요?", "options": ["신호 무시", "횡단보도와 신호 준수", "중앙선 침범"], "correctIndex": 1}'::jsonb,
  true
FROM public.events WHERE title = '강남역 지하·지상 연결 탐험';
