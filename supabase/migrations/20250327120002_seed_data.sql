-- WhereHere: Comprehensive seed data
-- 30 events (Seoul), 20 badges, 10 item catalog entries, missions per event

SET search_path = public, extensions;

--------------------------------------------------------------------------------
-- CLEAN EXISTING SEED DATA
--------------------------------------------------------------------------------

DELETE FROM public.mission_completions;
DELETE FROM public.event_completions;
DELETE FROM public.checkins;
DELETE FROM public.missions;
DELETE FROM public.user_badges;
DELETE FROM public.events;
DELETE FROM public.badges;

--------------------------------------------------------------------------------
-- ITEM CATALOG (reference table for awardable items)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.item_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_name text NOT NULL UNIQUE,
  description text,
  rarity public.rarity_level NOT NULL DEFAULT 'common',
  effect jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_catalog_select_authenticated
  ON public.item_catalog FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.item_catalog TO authenticated;
GRANT ALL ON public.item_catalog TO postgres, service_role;

DELETE FROM public.item_catalog;

INSERT INTO public.item_catalog (item_type, item_name, description, rarity, effect) VALUES
  ('booster',  'XP 부스터 (소)',     '다음 이벤트 완료 시 XP 1.5배',                 'common',    '{"xp_multiplier": 1.5, "duration_events": 1}'),
  ('booster',  'XP 부스터 (대)',     '다음 3회 이벤트 완료 시 XP 2배',                'rare',      '{"xp_multiplier": 2.0, "duration_events": 3}'),
  ('booster',  '더블 XP 패스',       '24시간 동안 모든 XP 2배',                       'epic',      '{"xp_multiplier": 2.0, "duration_hours": 24}'),
  ('skin',     '봄바람 스킨',        '캐릭터 봄 시즌 한정 스킨',                      'rare',      '{"season": "spring", "skin_id": "spring_breeze"}'),
  ('skin',     '별빛 스킨',          '캐릭터 야간 특별 스킨',                         'rare',      '{"skin_id": "starlight"}'),
  ('skin',     '황금 갑옷 스킨',     '전설의 황금 갑옷 캐릭터 스킨',                  'epic',      '{"skin_id": "golden_armor"}'),
  ('skin',     '네온 아우라 스킨',   '홍대 감성 네온 이펙트 스킨',                    'epic',      '{"skin_id": "neon_aura"}'),
  ('ticket',   '비밀 탐험 티켓',     '숨겨진 이벤트 1회 접근 가능',                   'epic',      '{"unlock_hidden_event": true, "uses": 1}'),
  ('ticket',   '전설 탐험 티켓',     '전설 등급 이벤트 접근 + 보상 2배',              'legendary', '{"unlock_legendary_event": true, "reward_multiplier": 2.0}'),
  ('ticket',   '시간여행 티켓',      '만료된 시즌 이벤트 1회 재도전 가능',            'legendary', '{"replay_expired_season": true, "uses": 1}');

--------------------------------------------------------------------------------
-- BADGES (20)
--------------------------------------------------------------------------------

INSERT INTO public.badges (name, description, icon_url, category, rarity, requirement_type, requirement_value) VALUES
  -- 탐험 횟수
  ('첫 발자국',       '첫 번째 이벤트를 완료했습니다.',         '🐾', 'achievement',  'common',    'completion_count',   '{"min": 1}'),
  ('열정 탐험가',     '이벤트를 10회 완료했습니다.',             '🔥', 'achievement',  'rare',      'completion_count',   '{"min": 10}'),
  ('전설의 발걸음',   '이벤트를 50회 완료했습니다.',             '👑', 'achievement',  'epic',      'completion_count',   '{"min": 50}'),

  -- 지역별 전문가
  ('홍대 전문가',     '홍대/마포구 이벤트를 5회 완료했습니다.',   '🎸', 'region',       'rare',      'district_completed', '{"district": "마포구", "min": 5}'),
  ('성수 전문가',     '성수/성동구 이벤트를 5회 완료했습니다.',   '☕', 'region',       'rare',      'district_completed', '{"district": "성동구", "min": 5}'),
  ('강남 전문가',     '강남구 이벤트를 5회 완료했습니다.',        '💎', 'region',       'rare',      'district_completed', '{"district": "강남구", "min": 5}'),
  ('이태원 전문가',   '이태원/용산구 이벤트를 5회 완료했습니다.', '🌍', 'region',       'rare',      'district_completed', '{"district": "용산구", "min": 5}'),
  ('종로 전문가',     '종로구 이벤트를 5회 완료했습니다.',        '🏛️', 'region',       'rare',      'district_completed', '{"district": "종로구", "min": 5}'),
  ('여의도 전문가',   '여의도/영등포구 이벤트를 5회 완료했습니다.','🌊', 'region',       'rare',      'district_completed', '{"district": "영등포구", "min": 5}'),

  -- 미션 타입별
  ('사진왕',          '사진 미션을 10회 제출했습니다.',           '📸', 'achievement',  'epic',      'photo_missions',     '{"min": 10}'),
  ('퀴즈왕',          '퀴즈 미션을 20회 정답 처리했습니다.',      '🧠', 'achievement',  'epic',      'quiz_correct',       '{"min": 20}'),

  -- 연속 기록
  ('일주일 연속 탐험', '7일 연속으로 탐험했습니다.',              '📅', 'achievement',  'rare',      'login_streak',       '{"min": 7}'),
  ('한달 연속 탐험',   '30일 연속으로 탐험했습니다.',             '🗓️', 'achievement',  'epic',      'login_streak',       '{"min": 30}'),

  -- 특별
  ('베타 테스터',     'WhereHere 초기 참여자입니다.',            '⭐', 'achievement',  'legendary', 'beta_tester',        '{"version": "1.0.0"}'),

  -- 시즌
  ('봄의 탐험가',     '봄 시즌 이벤트를 완료했습니다.',          '🌸', 'season',       'common',    'season_completed',   '{"season": "spring"}'),
  ('여름의 탐험가',   '여름 시즌 이벤트를 완료했습니다.',        '🌻', 'season',       'common',    'season_completed',   '{"season": "summer"}'),
  ('가을의 탐험가',   '가을 시즌 이벤트를 완료했습니다.',        '🍂', 'season',       'common',    'season_completed',   '{"season": "autumn"}'),
  ('겨울의 탐험가',   '겨울 시즌 이벤트를 완료했습니다.',        '❄️', 'season',       'common',    'season_completed',   '{"season": "winter"}'),

  -- 종합
  ('서울 마스터',     '서울 6개 핵심 지역을 모두 방문했습니다.', '🏆', 'exploration',  'legendary', 'all_districts',      '{"districts": ["마포구","성동구","강남구","용산구","종로구","영등포구"]}'),
  ('미션 헌터',       '미션을 100회 완료했습니다.',              '🎯', 'achievement',  'epic',      'mission_count',      '{"min": 100}');

--------------------------------------------------------------------------------
-- EVENTS (30) + MISSIONS
-- geography: ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
--------------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════════
-- 홍대 / 신촌 (8)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('홍대 걷고싶은거리 탐험', '홍대 메인 스트리트를 따라 숨겨진 스팟 3곳을 찾아보세요. 버스킹 무대부터 골목 갤러리까지 홍대의 진면목을 경험합니다.',
  ST_SetSRID(ST_MakePoint(126.9236, 37.5563), 4326)::geography,
  '서울 마포구 어울마당로 94', '마포구', 'exploration', 2, 45, 150, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '걷고싶은거리 도착', '홍대 걷고싶은거리 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '홍대 걷고싶은거리 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '거리 풍경 촬영', '가장 인상적인 거리 풍경을 사진으로 남겨주세요.', '{"hint": "건물, 사람, 간판 등 자유롭게"}'::jsonb, true
FROM public.events WHERE title = '홍대 걷고싶은거리 탐험';

-- 2. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('연트럴파크 포토 챌린지', '연남동 경의선숲길 공원에서 계절감이 느껴지는 인생샷을 남기세요.',
  ST_SetSRID(ST_MakePoint(126.9268, 37.5622), 4326)::geography,
  '서울 마포구 연남로 56', '마포구', 'photo', 1, 30, 100, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '연트럴파크 도착', '경의선숲길 연남동 구간에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '연트럴파크 포토 챌린지';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '나만의 인생샷', '공원의 자연과 함께 사진을 찍어주세요.', '{"hint": "나무, 꽃, 벤치 등 자유 구도"}'::jsonb, true
FROM public.events WHERE title = '연트럴파크 포토 챌린지';

-- 3. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('신촌 연세로 퀴즈 워크', '신촌 대학가의 역사와 문화에 대한 퀴즈를 풀며 걸어보세요.',
  ST_SetSRID(ST_MakePoint(126.9370, 37.5597), 4326)::geography,
  '서울 서대문구 연세로 일대', '서대문구', 'quiz', 2, 40, 140, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '신촌역 도착', '신촌역 인근에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '신촌 연세로 퀴즈 워크';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '신촌 역사 퀴즈', '신촌 지역의 역사에 대한 퀴즈입니다.',
  '{"question": "연세대학교가 설립된 해는?", "options": ["1885년", "1915년", "1946년", "1957년"], "correctIndex": 2}'::jsonb, true
FROM public.events WHERE title = '신촌 연세로 퀴즈 워크';

-- 4. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('상수동 카페골목 탐방', '상수역 근처 숨은 로스터리 카페와 디자인 소품샵을 발견해보세요.',
  ST_SetSRID(ST_MakePoint(126.9226, 37.5487), 4326)::geography,
  '서울 마포구 와우산로29길 일대', '마포구', 'exploration', 1, 30, 110, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '상수동 도착', '상수역 근처에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '상수동 카페골목 탐방';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'text', '나만의 카페 추천', '이 골목에서 가장 마음에 든 가게를 추천해주세요.', '{"maxLen": 200}'::jsonb, true
FROM public.events WHERE title = '상수동 카페골목 탐방';

-- 5. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('홍대 벽화골목 스냅', '홍대 벽화거리에서 아트 포토를 찍어 컬렉션을 완성하세요.',
  ST_SetSRID(ST_MakePoint(126.9218, 37.5547), 4326)::geography,
  '서울 마포구 와우산로21길', '마포구', 'photo', 2, 35, 130, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '벽화골목 입구 도착', '벽화골목 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '홍대 벽화골목 스냅';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '벽화와 함께', '마음에 드는 벽화를 배경으로 사진을 찍어주세요.', '{"hint": "벽화 전체가 보이게"}'::jsonb, true
FROM public.events WHERE title = '홍대 벽화골목 스냅';

-- 6. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('망원 한강공원 산책', '망원 한강공원에서 일몰을 보며 한강 둘레길을 걸어보세요.',
  ST_SetSRID(ST_MakePoint(126.8948, 37.5558), 4326)::geography,
  '서울 마포구 마포나루길 467', '마포구', 'exploration', 1, 40, 120, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '망원 한강공원 도착', '망원 한강공원에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '망원 한강공원 산책';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'timer', '3분 산책', '한강 둘레길을 따라 3분간 산책하세요.', '{"seconds": 180}'::jsonb, true
FROM public.events WHERE title = '망원 한강공원 산책';

-- 7. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('홍대 인디 음악 퀴즈', '홍대 인디 음악 씬의 역사와 문화에 대한 퀴즈를 풀어보세요.',
  ST_SetSRID(ST_MakePoint(126.9253, 37.5572), 4326)::geography,
  '서울 마포구 홍익로 20', '마포구', 'quiz', 3, 30, 170, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '라이브 클럽 거리 도착', '홍대 라이브 클럽 거리에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '홍대 인디 음악 퀴즈';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '인디 음악 퀴즈', '홍대 인디 음악 씬에 대한 퀴즈입니다.',
  '{"question": "홍대 인디 씬의 시작으로 알려진 라이브 클럽은?", "options": ["클럽 드러그", "롤링홀", "클럽 빵", "FF"], "correctIndex": 0}'::jsonb, true
FROM public.events WHERE title = '홍대 인디 음악 퀴즈';

-- 8. partnership
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, partner_name, is_active)
VALUES ('홍대 파트너 카페 투어', '제휴 카페 3곳을 방문하고 스탬프를 모아 특별 보상을 받으세요.',
  ST_SetSRID(ST_MakePoint(126.9247, 37.5555), 4326)::geography,
  '서울 마포구 어울마당로 일대', '마포구', 'partnership', 2, 60, 160, 'official', '홍대카페연합', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '첫 번째 카페 방문', '제휴 카페 첫 번째 스팟에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '홍대 파트너 카페 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '음료 인증샷', '주문한 음료와 함께 인증 사진을 남겨주세요.', '{"hint": "음료와 카페 로고가 보이게"}'::jsonb, true
FROM public.events WHERE title = '홍대 파트너 카페 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'text', '카페 리뷰', '방문한 카페에 대한 한 줄 리뷰를 남겨주세요.', '{"maxLen": 200}'::jsonb, false
FROM public.events WHERE title = '홍대 파트너 카페 투어';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 성수동 (6)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 9. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('성수동 카페거리 탐험', '서울의 브루클린이라 불리는 성수동 카페거리에서 숨은 로스터리를 찾아보세요.',
  ST_SetSRID(ST_MakePoint(127.0570, 37.5447), 4326)::geography,
  '서울 성동구 서울숲2길 일대', '성동구', 'exploration', 2, 40, 140, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '성수 카페거리 도착', '성수동 카페거리에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '성수동 카페거리 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '카페 외관 촬영', '가장 멋진 카페 외관을 사진으로 남겨주세요.', '{"hint": "건물 전체가 보이게"}'::jsonb, true
FROM public.events WHERE title = '성수동 카페거리 탐험';

-- 10. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('서울숲 포토 스팟 투어', '서울숲 곳곳에 숨겨진 포토 스팟을 찾아 인생 사진을 남기세요.',
  ST_SetSRID(ST_MakePoint(127.0374, 37.5443), 4326)::geography,
  '서울 성동구 뚝섬로 273', '성동구', 'photo', 1, 50, 120, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '서울숲 입구 도착', '서울숲 정문에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '서울숲 포토 스팟 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '숲 속 인생샷', '서울숲 안에서 자연과 함께 사진을 찍어주세요.', '{"hint": "나무, 호수, 사슴 등"}'::jsonb, true
FROM public.events WHERE title = '서울숲 포토 스팟 투어';

-- 11. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('성수 수제화거리 퀴즈', '성수동 수제화 장인의 역사와 문화를 퀴즈로 알아보세요.',
  ST_SetSRID(ST_MakePoint(127.0553, 37.5418), 4326)::geography,
  '서울 성동구 연무장5길', '성동구', 'quiz', 3, 35, 180, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '수제화거리 도착', '성수 수제화거리에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '성수 수제화거리 퀴즈';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '수제화 역사 퀴즈', '성수동 수제화에 대한 퀴즈입니다.',
  '{"question": "성수동이 수제화 명소가 된 시기는?", "options": ["1960년대", "1980년대", "2000년대", "2010년대"], "correctIndex": 1}'::jsonb, true
FROM public.events WHERE title = '성수 수제화거리 퀴즈';

-- 12. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('뚝섬역 레트로 골목 탐방', '뚝섬역 인근 공장 리모델링 건물과 레트로 골목을 걸어보세요.',
  ST_SetSRID(ST_MakePoint(127.0472, 37.5474), 4326)::geography,
  '서울 성동구 뚝섬로 일대', '성동구', 'exploration', 3, 45, 170, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '뚝섬역 도착', '뚝섬역 인근에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '뚝섬역 레트로 골목 탐방';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'text', '레트로 발견 일지', '골목에서 발견한 레트로 요소를 기록해주세요.', '{"maxLen": 300}'::jsonb, true
FROM public.events WHERE title = '뚝섬역 레트로 골목 탐방';

-- 13. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('성수 연무장길 스트리트 스냅', '연무장길의 팝업스토어와 갤러리에서 트렌디한 사진을 남기세요.',
  ST_SetSRID(ST_MakePoint(127.0563, 37.5442), 4326)::geography,
  '서울 성동구 연무장길 일대', '성동구', 'photo', 2, 40, 150, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '연무장길 도착', '연무장길에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '성수 연무장길 스트리트 스냅';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '팝업스토어 촬영', '가장 눈에 띄는 팝업스토어를 촬영해주세요.', '{"hint": "간판이나 전시물 포함"}'::jsonb, true
FROM public.events WHERE title = '성수 연무장길 스트리트 스냅';

-- 14. partnership
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, partner_name, is_active)
VALUES ('성수 파트너 갤러리 투어', '성수동 제휴 갤러리 2곳을 방문하고 전시 리뷰를 남겨보세요.',
  ST_SetSRID(ST_MakePoint(127.0558, 37.5437), 4326)::geography,
  '서울 성동구 서울숲4길', '성동구', 'partnership', 3, 60, 200, 'official', '성수갤러리협회', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '갤러리 스팟 도착', '제휴 갤러리에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '성수 파트너 갤러리 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '전시 작품 촬영', '마음에 드는 전시 작품을 사진으로 남겨주세요.', '{"hint": "촬영 허용된 작품만"}'::jsonb, true
FROM public.events WHERE title = '성수 파트너 갤러리 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'text', '전시 감상평', '관람한 전시에 대한 감상평을 남겨주세요.', '{"maxLen": 300}'::jsonb, false
FROM public.events WHERE title = '성수 파트너 갤러리 투어';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 강남 / 역삼 (5)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 15. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('강남역 지하도 탐험', '강남역 지하 연결통로를 따라 숨겨진 공간들을 발견해보세요.',
  ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326)::geography,
  '서울 강남구 강남대로 396', '강남구', 'exploration', 4, 50, 220, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '강남역 도착', '강남역 인근에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '강남역 지하도 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '강남 교통 퀴즈', '강남역 일대에 대한 퀴즈입니다.',
  '{"question": "강남역의 하루 평균 이용객 수는 약 얼마일까요?", "options": ["5만 명", "10만 명", "20만 명", "30만 명"], "correctIndex": 2}'::jsonb, true
FROM public.events WHERE title = '강남역 지하도 탐험';

-- 16. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('봉은사 포토 챌린지', '도심 한복판의 천년 고찰 봉은사에서 고즈넉한 사진을 남기세요.',
  ST_SetSRID(ST_MakePoint(127.0583, 37.5153), 4326)::geography,
  '서울 강남구 봉은사로 531', '강남구', 'photo', 3, 45, 180, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '봉은사 도착', '봉은사 경내에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '봉은사 포토 챌린지';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '사찰 풍경 촬영', '봉은사의 전통 건축물을 사진으로 담아주세요.', '{"hint": "대웅전, 미륵대불 등"}'::jsonb, true
FROM public.events WHERE title = '봉은사 포토 챌린지';

-- 17. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('코엑스몰 문화 퀴즈', '별마당 도서관과 코엑스몰에서 문화 퀴즈를 풀어보세요.',
  ST_SetSRID(ST_MakePoint(127.0591, 37.5116), 4326)::geography,
  '서울 강남구 영동대로 513', '강남구', 'quiz', 2, 35, 150, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '코엑스몰 도착', '코엑스몰 내부에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '코엑스몰 문화 퀴즈';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '별마당 도서관 퀴즈', '별마당 도서관에 대한 퀴즈입니다.',
  '{"question": "코엑스 별마당 도서관의 장서 수는 약 얼마일까요?", "options": ["1만 권", "5만 권", "7만 권", "15만 권"], "correctIndex": 2}'::jsonb, true
FROM public.events WHERE title = '코엑스몰 문화 퀴즈';

-- 18. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('테헤란로 IT 거리 탐험', '한국 IT 산업의 중심 테헤란로를 걸으며 스타트업 생태계를 느껴보세요.',
  ST_SetSRID(ST_MakePoint(127.0364, 37.5000), 4326)::geography,
  '서울 강남구 테헤란로 일대', '강남구', 'exploration', 3, 40, 190, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '역삼역 도착', '역삼역 인근에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '테헤란로 IT 거리 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'text', 'IT 거리 감상', '테헤란로에서 느낀 점을 기록해주세요.', '{"maxLen": 200}'::jsonb, true
FROM public.events WHERE title = '테헤란로 IT 거리 탐험';

-- 19. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('선정릉 역사 산책', '도심 속 조선 왕릉 선릉과 정릉을 걸으며 역사를 느껴보세요.',
  ST_SetSRID(ST_MakePoint(127.0487, 37.5084), 4326)::geography,
  '서울 강남구 선릉로100길 1', '강남구', 'exploration', 1, 35, 110, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '선정릉 도착', '선정릉 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '선정릉 역사 산책';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'timer', '왕릉 산책', '선정릉을 5분간 여유롭게 산책하세요.', '{"seconds": 300}'::jsonb, true
FROM public.events WHERE title = '선정릉 역사 산책';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 이태원 / 한남 (4)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 20. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('이태원 세계음식거리 탐방', '이태원의 다양한 세계 음식 거리를 걸으며 글로벌 문화를 체험하세요.',
  ST_SetSRID(ST_MakePoint(126.9946, 37.5341), 4326)::geography,
  '서울 용산구 이태원로 일대', '용산구', 'exploration', 3, 50, 180, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '이태원역 도착', '이태원역 인근에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '이태원 세계음식거리 탐방';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '세계 음식 촬영', '가장 이국적인 음식점이나 메뉴를 촬영해주세요.', '{"hint": "간판이나 음식 사진"}'::jsonb, true
FROM public.events WHERE title = '이태원 세계음식거리 탐방';

-- 21. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('한남동 블루스퀘어 포토', '블루스퀘어 주변의 예술적인 건축물과 거리를 사진으로 담아보세요.',
  ST_SetSRID(ST_MakePoint(126.9973, 37.5353), 4326)::geography,
  '서울 용산구 이태원로 294', '용산구', 'photo', 2, 35, 140, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '블루스퀘어 도착', '블루스퀘어 앞에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '한남동 블루스퀘어 포토';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '건축물 촬영', '블루스퀘어 건물을 예술적으로 촬영해주세요.', '{"hint": "건물 전체 또는 디테일"}'::jsonb, true
FROM public.events WHERE title = '한남동 블루스퀘어 포토';

-- 22. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('경리단길 퀴즈 워크', '용산 경리단길의 숨겨진 이야기와 역사를 퀴즈로 풀어보세요.',
  ST_SetSRID(ST_MakePoint(126.9883, 37.5376), 4326)::geography,
  '서울 용산구 회나무로 일대', '용산구', 'quiz', 4, 40, 230, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '경리단길 입구 도착', '경리단길 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '경리단길 퀴즈 워크';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '경리단길 역사 퀴즈', '경리단길의 유래에 대한 퀴즈입니다.',
  '{"question": "경리단길의 이름은 어디에서 유래했을까요?", "options": ["경리단 부대", "경리학교", "경리청", "경리병과"], "correctIndex": 0}'::jsonb, true
FROM public.events WHERE title = '경리단길 퀴즈 워크';

-- 23. partnership
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, partner_name, is_active)
VALUES ('이태원 파트너 맛집 투어', '이태원 제휴 레스토랑을 방문하고 특별 할인 혜택을 받으세요.',
  ST_SetSRID(ST_MakePoint(126.9917, 37.5346), 4326)::geography,
  '서울 용산구 이태원로27가길', '용산구', 'partnership', 2, 60, 160, 'official', '이태원맛집연합', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '파트너 레스토랑 도착', '제휴 레스토랑에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '이태원 파트너 맛집 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '음식 인증', '주문한 음식을 사진으로 인증해주세요.', '{"hint": "메뉴 이름이 보이면 좋아요"}'::jsonb, true
FROM public.events WHERE title = '이태원 파트너 맛집 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'text', '맛집 리뷰', '방문한 레스토랑에 대한 솔직한 리뷰를 남겨주세요.', '{"maxLen": 300}'::jsonb, false
FROM public.events WHERE title = '이태원 파트너 맛집 투어';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 종로 / 인사동 (4)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 24. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('북촌 한옥마을 탐험', '서울 600년 역사가 살아 숨쉬는 북촌 한옥마을 골목을 탐험하세요.',
  ST_SetSRID(ST_MakePoint(126.9857, 37.5828), 4326)::geography,
  '서울 종로구 북촌로 일대', '종로구', 'exploration', 4, 60, 240, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '북촌 입구 도착', '북촌 한옥마을 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '북촌 한옥마을 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '한옥 풍경', '가장 아름다운 한옥 골목을 사진으로 남겨주세요.', '{"hint": "북촌 8경 중 하나를 추천"}'::jsonb, true
FROM public.events WHERE title = '북촌 한옥마을 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'quiz', '한옥 건축 퀴즈', '한옥 건축에 대한 퀴즈입니다.',
  '{"question": "한옥 지붕의 아름다운 곡선을 무엇이라 부를까요?", "options": ["추녀", "처마", "용마루", "지붕선"], "correctIndex": 1}'::jsonb, true
FROM public.events WHERE title = '북촌 한옥마을 탐험';

-- 25. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('인사동 거리 포토 챌린지', '인사동의 전통과 현대가 어우러진 거리에서 감성 사진을 남기세요.',
  ST_SetSRID(ST_MakePoint(126.9854, 37.5741), 4326)::geography,
  '서울 종로구 인사동길 일대', '종로구', 'photo', 2, 40, 150, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '인사동 도착', '인사동 거리에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '인사동 거리 포토 챌린지';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '전통 가게 촬영', '인사동의 전통 공예품 가게나 찻집을 촬영해주세요.', '{"hint": "한글 간판이 보이면 좋아요"}'::jsonb, true
FROM public.events WHERE title = '인사동 거리 포토 챌린지';

-- 26. quiz
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('종묘 역사 퀴즈 투어', '유네스코 세계문화유산 종묘에서 조선 왕실의 역사를 퀴즈로 풀어보세요.',
  ST_SetSRID(ST_MakePoint(126.9946, 37.5719), 4326)::geography,
  '서울 종로구 종로 157', '종로구', 'quiz', 5, 60, 300, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '종묘 입구 도착', '종묘 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '종묘 역사 퀴즈 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'quiz', '종묘 역사 퀴즈', '종묘에 대한 역사 퀴즈입니다.',
  '{"question": "종묘는 어떤 목적으로 지어진 건물일까요?", "options": ["왕의 거처", "조선 왕과 왕비의 신위를 모신 사당", "외교 접견장", "과거 시험장"], "correctIndex": 1}'::jsonb, true
FROM public.events WHERE title = '종묘 역사 퀴즈 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'text', '감상문 작성', '종묘를 방문한 소감을 적어주세요.', '{"maxLen": 300}'::jsonb, false
FROM public.events WHERE title = '종묘 역사 퀴즈 투어';

-- 27. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('삼청동길 예술 산책', '삼청동의 갤러리와 공방들을 탐방하며 예술 감성을 채워보세요.',
  ST_SetSRID(ST_MakePoint(126.9821, 37.5804), 4326)::geography,
  '서울 종로구 삼청로 일대', '종로구', 'exploration', 2, 40, 150, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '삼청동 도착', '삼청동길 입구에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '삼청동길 예술 산책';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '갤러리 발견', '삼청동의 갤러리나 공방 앞에서 사진을 찍어주세요.', '{"hint": "간판이 보이게"}'::jsonb, true
FROM public.events WHERE title = '삼청동길 예술 산책';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 여의도 (3)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 28. exploration
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active)
VALUES ('여의도 한강공원 탐험', '여의도 한강공원에서 물빛 광장과 자전거 도로를 따라 탐험하세요.',
  ST_SetSRID(ST_MakePoint(126.9350, 37.5280), 4326)::geography,
  '서울 영등포구 여의동로 330', '영등포구', 'exploration', 1, 40, 100, 'official', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '한강공원 도착', '여의도 한강공원에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '여의도 한강공원 탐험';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'timer', '한강 산책', '한강변을 5분간 산책하세요.', '{"seconds": 300}'::jsonb, true
FROM public.events WHERE title = '여의도 한강공원 탐험';

-- 29. photo
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, is_active, is_seasonal, expires_at)
VALUES ('여의도 벚꽃길 포토', '여의도 윤중로 벚꽃길에서 봄의 아름다움을 사진으로 담아보세요.',
  ST_SetSRID(ST_MakePoint(126.9222, 37.5226), 4326)::geography,
  '서울 영등포구 여의서로 일대', '영등포구', 'photo', 3, 45, 200, 'official', true, true, now() + interval '180 days');

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', '벚꽃길 도착', '윤중로 벚꽃길에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '여의도 벚꽃길 포토';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '벚꽃 인생샷', '벚꽃과 함께 인생 사진을 남겨주세요.', '{"hint": "벚꽃이 화면의 절반 이상"}'::jsonb, true
FROM public.events WHERE title = '여의도 벚꽃길 포토';

-- 30. partnership
INSERT INTO public.events (title, description, location, address, district, category, difficulty, time_limit_minutes, reward_xp, creator_type, partner_name, is_active)
VALUES ('여의도 IFC몰 파트너 투어', '여의도 IFC몰 제휴 매장을 방문하고 특별 쿠폰을 받으세요.',
  ST_SetSRID(ST_MakePoint(126.9262, 37.5253), 4326)::geography,
  '서울 영등포구 국제금융로 10', '영등포구', 'partnership', 2, 50, 160, 'official', 'IFC몰', true);

INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 1, 'gps_checkin', 'IFC몰 도착', 'IFC몰 내부에서 체크인하세요.', '{}'::jsonb, true
FROM public.events WHERE title = '여의도 IFC몰 파트너 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 2, 'photo', '매장 방문 인증', '제휴 매장을 방문한 사진을 남겨주세요.', '{"hint": "매장 간판이 보이게"}'::jsonb, true
FROM public.events WHERE title = '여의도 IFC몰 파트너 투어';
INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
SELECT id, 3, 'text', '쇼핑 후기', '방문한 매장에 대한 한 줄 후기를 남겨주세요.', '{"maxLen": 200}'::jsonb, false
FROM public.events WHERE title = '여의도 IFC몰 파트너 투어';
