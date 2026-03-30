SET search_path = public, extensions;

-- Add visibility conditions column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS
  visibility_conditions jsonb DEFAULT NULL;

-- Examples:
-- { "weather": "rain" } → show only when raining
-- { "weather": "clear", "time": "night" } → clear night only
-- { "time": "morning" } → 06:00-12:00 only
-- { "time": "night" } → 20:00-06:00 only
-- { "season": "spring" } → March-May
-- null → always visible

COMMENT ON COLUMN public.events.visibility_conditions IS 
  'JSON conditions for conditional display. Keys: weather (rain/clear/snow/clouds), time (morning/afternoon/evening/night), season (spring/summer/autumn/winter). null = always visible.';

-- Insert 5 conditional seed events
INSERT INTO public.events (title, description, narrative, location, address, district, category, difficulty, reward_xp, creator_type, is_active, visibility_conditions)
VALUES
  ('빗속의 성수 산책', '비 오는 날에만 열리는 특별한 성수동 탐험', '빗방울이 성수동 골목에 리듬을 만들어요. 우산 아래 숨겨진 예술 작품을 찾아보세요. 비 오는 날만의 특별한 풍경이 당신을 기다립니다.', ST_SetSRID(ST_MakePoint(127.0560, 37.5399), 4326)::geography, '서울 성동구 성수이로 78', '성수동', 'exploration', 2, 200, 'system', true, '{"weather": "rain"}'),
  ('홍대 야경 탐험가', '밤에만 빛나는 홍대의 숨겨진 네온 아트', '해가 지면 홍대는 완전히 다른 세계가 됩니다. 네온 불빛 사이로 숨겨진 예술을 찾아 떠나보세요. 밤의 탐험가만이 발견할 수 있는 비밀이 있습니다.', ST_SetSRID(ST_MakePoint(126.9209, 37.5509), 4326)::geography, '서울 마포구 어울마당로 65', '홍대', 'photo', 3, 250, 'system', true, '{"time": "night"}'),
  ('한강 일출 챌린지', '이른 아침, 여의도 한강에서 일출을 맞이하세요', '새벽 안개가 한강 위를 감싸는 순간, 도시가 깨어나기 전의 고요함을 느껴보세요. 아침의 첫 빛이 여의도를 물들이는 장면은 잊을 수 없을 거예요.', ST_SetSRID(ST_MakePoint(126.9320, 37.5283), 4326)::geography, '서울 영등포구 여의동로 330', '여의도', 'photo', 2, 200, 'system', true, '{"time": "morning"}'),
  ('벚꽃 인사동 투어', '봄에만 만날 수 있는 인사동의 벚꽃 명소', '봄바람에 흩날리는 벚꽃잎이 인사동 골목을 수놓습니다. 전통과 자연이 어우러진 이 특별한 풍경은 봄에만 만날 수 있어요.', ST_SetSRID(ST_MakePoint(126.9850, 37.5741), 4326)::geography, '서울 종로구 인사동길 62', '종로', 'exploration', 1, 150, 'system', true, '{"season": "spring"}'),
  ('청담동 하늘 사진전', '맑은 날 강남의 하늘과 건축물을 담아보세요', '구름 한 점 없는 파란 하늘 아래, 청담동의 현대 건축물들이 빛납니다. 하늘과 도시가 만드는 완벽한 프레임을 카메라에 담아보세요.', ST_SetSRID(ST_MakePoint(127.0397, 37.5199), 4326)::geography, '서울 강남구 청담동 89', '강남', 'photo', 2, 200, 'system', true, '{"weather": "clear"}');

-- Add missions for conditional events
DO $$
DECLARE
  ev RECORD;
BEGIN
  FOR ev IN SELECT id, title FROM public.events WHERE visibility_conditions IS NOT NULL
  LOOP
    INSERT INTO public.missions (event_id, step_order, mission_type, title, description, config, required)
    VALUES
      (ev.id, 1, 'gps_checkin', ev.title || ' 도착', '해당 장소에 도착하여 GPS 체크인을 완료하세요.', '{"radius_m": 100}'::jsonb, true),
      (ev.id, 2, 'photo', '특별한 순간 촬영', '이 특별한 조건에서만 볼 수 있는 풍경을 촬영하세요.', '{"prompt": "조건부 이벤트의 특별한 풍경을 촬영해주세요"}'::jsonb, true);
  END LOOP;
END $$;
