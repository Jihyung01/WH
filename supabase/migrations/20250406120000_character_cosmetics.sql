-- ============================================================================
-- WhereHere: Character Cosmetics, Titles & Personality System
-- 현실 행동 → 캐릭터 정체성 전환 데이터 계층
-- ============================================================================

-- ── 1. character_cosmetics (마스터 카탈로그) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS character_cosmetics (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  description    TEXT,
  slot           TEXT        NOT NULL CHECK (slot IN ('hat','outfit','accessory','background','aura')),
  rarity         TEXT        NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  preview_emoji  TEXT        NOT NULL,
  effect_type    TEXT        CHECK (effect_type IN ('xp_boost','discovery_range','streak_shield','coin_bonus','cosmetic_only')),
  effect_value   NUMERIC     DEFAULT 0,
  effect_description TEXT,
  unlock_method  TEXT        NOT NULL CHECK (unlock_method IN ('quest','purchase','achievement','season','event','special')),
  coin_price     INT         DEFAULT 0,
  is_premium     BOOLEAN     DEFAULT false,
  character_class_restriction TEXT[] DEFAULT NULL,
  min_level      INT         DEFAULT 1,
  is_limited     BOOLEAN     DEFAULT false,
  released_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cosmetics_slot ON character_cosmetics(slot);
CREATE INDEX IF NOT EXISTS idx_cosmetics_rarity ON character_cosmetics(rarity);
CREATE INDEX IF NOT EXISTS idx_cosmetics_unlock ON character_cosmetics(unlock_method);
CREATE INDEX IF NOT EXISTS idx_cosmetics_premium ON character_cosmetics(is_premium);

-- ── 2. user_cosmetics (유저 보유 코스메틱) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS user_cosmetics (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cosmetic_id UUID        NOT NULL REFERENCES character_cosmetics(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  acquired_via TEXT       NOT NULL CHECK (acquired_via IN ('quest','purchase','achievement','gift','drop','season','event')),
  UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON user_cosmetics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_cosmetic ON user_cosmetics(cosmetic_id);

-- ── 3. character_loadout (현재 장착 상태) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS character_loadout (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_id UUID       NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot        TEXT        NOT NULL CHECK (slot IN ('hat','outfit','accessory','background','aura')),
  cosmetic_id UUID        NOT NULL REFERENCES character_cosmetics(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_loadout_user ON character_loadout(user_id);

-- ── 4. character_titles (칭호 마스터 데이터) ────────────────────────────────

CREATE TABLE IF NOT EXISTS character_titles (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT        NOT NULL,
  description      TEXT,
  rarity           TEXT        NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  unlock_condition JSONB       NOT NULL,
  category         TEXT        CHECK (category IN ('exploration','district','social','achievement','season')),
  icon_emoji       TEXT        DEFAULT '🏅',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. user_titles (유저 획득 칭호) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_titles (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id  UUID        NOT NULL REFERENCES character_titles(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, title_id)
);

-- ── 6. 기존 테이블 확장 ────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_title_id UUID DEFAULT NULL;
-- FK는 character_titles 생성 후 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_active_title_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_active_title_id_fkey
      FOREIGN KEY (active_title_id) REFERENCES character_titles(id);
  END IF;
END $$;

ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'happy';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS favorite_district TEXT DEFAULT NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS equipped_title TEXT DEFAULT NULL;

-- mood CHECK 제약 (이미 있을 수 있으므로 DO 블록)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'characters_mood_check'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT characters_mood_check
      CHECK (mood IN ('happy','excited','tired','curious','proud','adventurous'));
  END IF;
END $$;

-- ── 7. RLS 정책 ────────────────────────────────────────────────────────────

ALTER TABLE character_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_loadout ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- character_cosmetics: 인증 유저 조회
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cosmetics_select_auth') THEN
    CREATE POLICY cosmetics_select_auth ON character_cosmetics
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- character_titles: 인증 유저 조회
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'titles_select_auth') THEN
    CREATE POLICY titles_select_auth ON character_titles
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- user_cosmetics: 본인만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_cosmetics_select') THEN
    CREATE POLICY user_cosmetics_select ON user_cosmetics
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_cosmetics_insert') THEN
    CREATE POLICY user_cosmetics_insert ON user_cosmetics
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_cosmetics_delete') THEN
    CREATE POLICY user_cosmetics_delete ON user_cosmetics
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- character_loadout: 본인만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadout_select') THEN
    CREATE POLICY loadout_select ON character_loadout
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadout_insert') THEN
    CREATE POLICY loadout_insert ON character_loadout
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadout_update') THEN
    CREATE POLICY loadout_update ON character_loadout
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loadout_delete') THEN
    CREATE POLICY loadout_delete ON character_loadout
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- user_titles: 본인만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_titles_select') THEN
    CREATE POLICY user_titles_select ON user_titles
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_titles_insert') THEN
    CREATE POLICY user_titles_insert ON user_titles
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- Part B: RPC 함수
-- ============================================================================

-- ── 1. purchase_cosmetic ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION purchase_cosmetic(p_user_id UUID, p_cosmetic_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coins       INT;
  v_cosmetic    RECORD;
  v_char        RECORD;
  v_profile     RECORD;
  v_already     BOOLEAN;
BEGIN
  -- 코스메틱 정보 조회
  SELECT * INTO v_cosmetic FROM character_cosmetics WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '존재하지 않는 아이템입니다.');
  END IF;

  -- 구매 불가 아이템 체크
  IF v_cosmetic.unlock_method != 'purchase' THEN
    RETURN json_build_object('success', false, 'error', '구매할 수 없는 아이템입니다.');
  END IF;

  -- 한정 아이템 만료 체크
  IF v_cosmetic.is_limited AND v_cosmetic.expires_at IS NOT NULL AND v_cosmetic.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', '판매 기간이 종료된 아이템입니다.');
  END IF;

  -- 이미 보유 체크
  SELECT EXISTS(
    SELECT 1 FROM user_cosmetics WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id
  ) INTO v_already;
  IF v_already THEN
    RETURN json_build_object('success', false, 'error', '이미 보유한 아이템입니다.');
  END IF;

  -- 프로필 잠금 (동시성 방지)
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '프로필을 찾을 수 없습니다.');
  END IF;

  v_coins := COALESCE(v_profile.coins, 0);

  -- 코인 잔액 체크
  IF v_coins < v_cosmetic.coin_price THEN
    RETURN json_build_object('success', false, 'error', '코인이 부족합니다.',
      'required', v_cosmetic.coin_price, 'current', v_coins);
  END IF;

  -- 캐릭터 정보 조회 (클래스 제한 + 레벨 체크)
  SELECT * INTO v_char FROM characters WHERE user_id = p_user_id LIMIT 1;
  IF FOUND THEN
    -- 최소 레벨 체크
    IF v_char.level < v_cosmetic.min_level THEN
      RETURN json_build_object('success', false, 'error',
        format('레벨 %s 이상에서 구매할 수 있습니다.', v_cosmetic.min_level));
    END IF;
    -- 클래스 제한 체크
    IF v_cosmetic.character_class_restriction IS NOT NULL
       AND NOT (v_char.character_type = ANY(v_cosmetic.character_class_restriction)) THEN
      RETURN json_build_object('success', false, 'error', '해당 캐릭터로는 구매할 수 없는 아이템입니다.');
    END IF;
  END IF;

  -- 프리미엄 체크
  IF v_cosmetic.is_premium THEN
    IF NOT COALESCE((SELECT is_premium FROM profiles WHERE id = p_user_id), false) THEN
      RETURN json_build_object('success', false, 'error', '프리미엄 회원 전용 아이템입니다.');
    END IF;
  END IF;

  -- 코인 차감
  UPDATE profiles SET coins = coins - v_cosmetic.coin_price WHERE id = p_user_id;

  -- 보유 목록에 추가
  INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
  VALUES (p_user_id, p_cosmetic_id, 'purchase');

  RETURN json_build_object(
    'success', true,
    'remaining_coins', v_coins - v_cosmetic.coin_price,
    'cosmetic_name', v_cosmetic.name
  );
END;
$$;


-- ── 2. equip_cosmetic ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION equip_cosmetic(p_user_id UUID, p_cosmetic_id UUID, p_slot TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cosmetic RECORD;
  v_char     RECORD;
  v_owned    BOOLEAN;
BEGIN
  -- 코스메틱 존재 확인
  SELECT * INTO v_cosmetic FROM character_cosmetics WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '존재하지 않는 아이템입니다.');
  END IF;

  -- 슬롯 일치 확인
  IF v_cosmetic.slot != p_slot THEN
    RETURN json_build_object('success', false, 'error', '해당 슬롯에 장착할 수 없는 아이템입니다.');
  END IF;

  -- 보유 확인
  SELECT EXISTS(
    SELECT 1 FROM user_cosmetics WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id
  ) INTO v_owned;
  IF NOT v_owned THEN
    RETURN json_build_object('success', false, 'error', '보유하지 않은 아이템입니다.');
  END IF;

  -- 캐릭터 조회
  SELECT * INTO v_char FROM characters WHERE user_id = p_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '캐릭터를 찾을 수 없습니다.');
  END IF;

  -- 기존 장착 해제 + 새 장착 (UPSERT)
  INSERT INTO character_loadout (user_id, character_id, slot, cosmetic_id, equipped_at)
  VALUES (p_user_id, v_char.id, p_slot, p_cosmetic_id, NOW())
  ON CONFLICT (user_id, slot)
  DO UPDATE SET cosmetic_id = EXCLUDED.cosmetic_id, equipped_at = NOW();

  RETURN json_build_object(
    'success', true,
    'slot', p_slot,
    'cosmetic_name', v_cosmetic.name
  );
END;
$$;


-- ── 3. unequip_cosmetic ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION unequip_cosmetic(p_user_id UUID, p_slot TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM character_loadout
  WHERE user_id = p_user_id AND slot = p_slot;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN json_build_object('success', false, 'error', '해당 슬롯에 장착된 아이템이 없습니다.');
  END IF;

  RETURN json_build_object('success', true, 'slot', p_slot);
END;
$$;


-- ── 4. check_and_grant_titles ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_and_grant_titles(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title          RECORD;
  v_cond           JSONB;
  v_cond_type      TEXT;
  v_earned         BOOLEAN;
  v_newly_earned   JSON[] := '{}';
  -- 통계 캐시
  v_total_events   INT;
  v_login_streak   INT;
  v_level          INT;
  v_distance_km    NUMERIC;
  v_photo_missions INT;
  v_quiz_total     INT;
  v_quiz_correct   INT;
BEGIN
  -- ── 기본 통계 집계 ────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_total_events
  FROM event_completions WHERE user_id = p_user_id;

  SELECT COALESCE(p.login_streak, 0), COALESCE(c.level, 1), COALESCE(c.total_distance_km, 0)
  INTO v_login_streak, v_level, v_distance_km
  FROM profiles p
  LEFT JOIN characters c ON c.user_id = p.id
  WHERE p.id = p_user_id;

  SELECT COUNT(*) INTO v_photo_missions
  FROM mission_completions mc
  JOIN missions m ON m.id = mc.mission_id
  WHERE mc.user_id = p_user_id AND m.mission_type = 'photo';

  SELECT COUNT(*) INTO v_quiz_total
  FROM mission_completions mc
  JOIN missions m ON m.id = mc.mission_id
  WHERE mc.user_id = p_user_id AND m.mission_type = 'quiz';

  -- 퀴즈 정답 수 (answer = 'correct' 또는 proof_url LIKE '%correct%' 등 — 단순화: 완료 = 정답으로 처리)
  v_quiz_correct := v_quiz_total;

  -- ── 미획득 칭호 순회 ──────────────────────────────────────────────────
  FOR v_title IN
    SELECT ct.*
    FROM character_titles ct
    WHERE NOT EXISTS (
      SELECT 1 FROM user_titles ut
      WHERE ut.user_id = p_user_id AND ut.title_id = ct.id
    )
  LOOP
    v_cond := v_title.unlock_condition;
    v_cond_type := v_cond ->> 'type';
    v_earned := false;

    CASE v_cond_type
      WHEN 'total_events' THEN
        v_earned := v_total_events >= (v_cond ->> 'count')::INT;

      WHEN 'district_events' THEN
        DECLARE v_district_count INT;
        BEGIN
          SELECT COUNT(*) INTO v_district_count
          FROM event_completions ec
          JOIN events e ON e.id = ec.event_id
          WHERE ec.user_id = p_user_id AND e.district = (v_cond ->> 'district');
          v_earned := v_district_count >= (v_cond ->> 'count')::INT;
        END;

      WHEN 'night_events' THEN
        DECLARE v_night_count INT;
        BEGIN
          SELECT COUNT(*) INTO v_night_count
          FROM event_completions ec
          WHERE ec.user_id = p_user_id
            AND EXTRACT(HOUR FROM ec.completed_at) >= 20
               OR EXTRACT(HOUR FROM ec.completed_at) < 5;
          v_earned := v_night_count >= (v_cond ->> 'count')::INT;
        END;

      WHEN 'rain_events' THEN
        -- 비 이벤트는 별도 weather 데이터가 필요; 현재는 placeholder
        v_earned := false;

      WHEN 'photo_missions' THEN
        v_earned := v_photo_missions >= (v_cond ->> 'count')::INT;

      WHEN 'quiz_accuracy' THEN
        IF v_quiz_total >= COALESCE((v_cond ->> 'min_count')::INT, 20) THEN
          v_earned := (v_quiz_correct::NUMERIC / GREATEST(v_quiz_total, 1)) >= COALESCE((v_cond ->> 'min_rate')::NUMERIC, 0.9);
        END IF;

      WHEN 'streak' THEN
        v_earned := v_login_streak >= (v_cond ->> 'days')::INT;

      WHEN 'distance_km' THEN
        v_earned := v_distance_km >= (v_cond ->> 'min')::NUMERIC;

      WHEN 'level' THEN
        v_earned := v_level >= (v_cond ->> 'min')::INT;

      ELSE
        v_earned := false;
    END CASE;

    IF v_earned THEN
      INSERT INTO user_titles (user_id, title_id)
      VALUES (p_user_id, v_title.id)
      ON CONFLICT (user_id, title_id) DO NOTHING;

      v_newly_earned := array_append(v_newly_earned,
        json_build_object('id', v_title.id, 'name', v_title.name, 'rarity', v_title.rarity));
    END IF;
  END LOOP;

  RETURN json_build_object('newly_earned_titles', v_newly_earned);
END;
$$;


-- ── 5. update_character_personality ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_character_personality(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_events    INT;
  v_night_events    INT;
  v_photo_missions  INT;
  v_quiz_missions   INT;
  v_total_missions  INT;
  v_distance_km     NUMERIC;
  v_top_district    TEXT;
  v_district_count  INT;
  v_traits          TEXT[] := '{}';
  v_mood            TEXT := 'happy';
  v_recent_count    INT;
BEGIN
  -- 총 이벤트
  SELECT COUNT(*) INTO v_total_events
  FROM event_completions WHERE user_id = p_user_id;

  -- 밤 이벤트 비율
  SELECT COUNT(*) INTO v_night_events
  FROM event_completions ec
  WHERE ec.user_id = p_user_id
    AND (EXTRACT(HOUR FROM ec.completed_at) >= 20
         OR EXTRACT(HOUR FROM ec.completed_at) < 5);

  -- 미션 타입별 카운트
  SELECT COUNT(*) INTO v_photo_missions
  FROM mission_completions mc
  JOIN missions m ON m.id = mc.mission_id
  WHERE mc.user_id = p_user_id AND m.mission_type = 'photo';

  SELECT COUNT(*) INTO v_quiz_missions
  FROM mission_completions mc
  JOIN missions m ON m.id = mc.mission_id
  WHERE mc.user_id = p_user_id AND m.mission_type = 'quiz';

  SELECT COUNT(*) INTO v_total_missions
  FROM mission_completions WHERE user_id = p_user_id;

  -- 총 거리
  SELECT COALESCE(total_distance_km, 0) INTO v_distance_km
  FROM characters WHERE user_id = p_user_id LIMIT 1;

  -- 가장 많이 탐험한 지역
  SELECT e.district, COUNT(*) AS cnt INTO v_top_district, v_district_count
  FROM event_completions ec
  JOIN events e ON e.id = ec.event_id
  WHERE ec.user_id = p_user_id AND e.district IS NOT NULL
  GROUP BY e.district
  ORDER BY cnt DESC
  LIMIT 1;

  -- ── 특성 추출 (상위 3개) ────────────────────────────────────────────
  -- 밤 탐험가
  IF v_total_events > 0 AND (v_night_events::NUMERIC / v_total_events) >= 0.3 THEN
    v_traits := array_append(v_traits, '야행성');
  END IF;

  -- 사진 애호가
  IF v_total_missions > 0 AND (v_photo_missions::NUMERIC / v_total_missions) >= 0.25 THEN
    v_traits := array_append(v_traits, '시각적 탐험가');
  END IF;

  -- 박학다식
  IF v_quiz_missions >= 10 THEN
    v_traits := array_append(v_traits, '박학다식');
  END IF;

  -- 장거리 러너
  IF v_distance_km >= 50 THEN
    v_traits := array_append(v_traits, '장거리 러너');
  ELSIF v_top_district IS NOT NULL AND v_district_count >= 5 THEN
    v_traits := array_append(v_traits, v_top_district || ' 마니아');
  END IF;

  -- 꾸준한 탐험가 (최근 7일 활동)
  SELECT COUNT(*) INTO v_recent_count
  FROM event_completions
  WHERE user_id = p_user_id AND completed_at >= NOW() - INTERVAL '7 days';

  IF v_recent_count >= 5 THEN
    v_traits := array_append(v_traits, '열정적 탐험가');
  END IF;

  -- 상위 3개로 자르기
  IF array_length(v_traits, 1) IS NULL OR array_length(v_traits, 1) = 0 THEN
    v_traits := ARRAY['초보 탐험가'];
  ELSIF array_length(v_traits, 1) > 3 THEN
    v_traits := v_traits[1:3];
  END IF;

  -- ── 무드 결정 ─────────────────────────────────────────────────────
  IF v_recent_count >= 5 THEN
    v_mood := 'excited';
  ELSIF v_recent_count >= 3 THEN
    v_mood := 'adventurous';
  ELSIF v_recent_count >= 1 THEN
    v_mood := 'curious';
  ELSIF v_total_events >= 10 THEN
    v_mood := 'proud';
  ELSE
    v_mood := 'happy';
  END IF;

  -- ── 캐릭터 업데이트 ──────────────────────────────────────────────
  UPDATE characters
  SET personality_traits = to_jsonb(v_traits),
      favorite_district = v_top_district,
      mood = v_mood
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'traits', v_traits,
    'mood', v_mood,
    'favorite_district', v_top_district
  );
END;
$$;


-- ============================================================================
-- 시드 데이터: 코스메틱 30개 + 칭호 20개
-- ============================================================================

-- ── 코스메틱: hat (8) ───────────────────────────────────────────────────────

INSERT INTO character_cosmetics (name, description, slot, rarity, preview_emoji, effect_type, effect_value, effect_description, unlock_method, coin_price, is_premium, min_level, is_limited) VALUES
  ('탐험가 모자', '모든 탐험가의 첫 번째 동반자', 'hat', 'common', '🎩', 'cosmetic_only', 0, NULL, 'quest', 0, false, 1, false),
  ('꽃 화관', '봄바람에 흩날리는 꽃잎처럼', 'hat', 'rare', '🌸', 'xp_boost', 0.05, 'XP 획득량 +5%', 'purchase', 200, false, 1, false),
  ('마법사 모자', '더 넓은 세상을 감지하는 힘', 'hat', 'rare', '🧙', 'discovery_range', 50, '탐색 범위 +50m', 'purchase', 300, false, 5, false),
  ('왕관', '전설의 탐험가만이 쓸 수 있는 왕관', 'hat', 'legendary', '👑', 'xp_boost', 0.2, 'XP 획득량 +20%', 'achievement', 0, false, 30, false),
  ('산타 모자', '겨울 시즌 한정 특별 아이템', 'hat', 'epic', '🎅', 'coin_bonus', 0.1, '코인 획득량 +10%', 'season', 0, false, 1, true),
  ('고양이 귀', '호기심 가득한 탐험가의 상징', 'hat', 'common', '🐱', 'cosmetic_only', 0, NULL, 'purchase', 100, false, 1, false),
  ('선글라스', '쿨한 탐험가의 필수 아이템', 'hat', 'common', '🕶️', 'cosmetic_only', 0, NULL, 'purchase', 50, false, 1, false),
  ('용사의 투구', '어떤 위험도 두렵지 않은 용기', 'hat', 'legendary', '⚔️', 'xp_boost', 0.15, 'XP +15% & 스트릭 보호', 'purchase', 5000, false, 20, false)
ON CONFLICT DO NOTHING;

-- ── 코스메틱: outfit (8) ────────────────────────────────────────────────────

INSERT INTO character_cosmetics (name, description, slot, rarity, preview_emoji, effect_type, effect_value, effect_description, unlock_method, coin_price, is_premium, min_level, is_limited) VALUES
  ('기본 티셔츠', '편안한 탐험의 시작', 'outfit', 'common', '👕', 'cosmetic_only', 0, NULL, 'quest', 0, false, 1, false),
  ('숲 속 로브', '숲의 기운이 담긴 로브', 'outfit', 'rare', '🌿', 'discovery_range', 100, '탐색 범위 +100m', 'purchase', 400, false, 5, false),
  ('별빛 망토', '밤하늘의 별을 담은 망토', 'outfit', 'epic', '✨', 'xp_boost', 0.1, 'XP 획득량 +10%', 'purchase', 1000, false, 10, false),
  ('용사 갑옷', '100번의 탐험이 만든 전설', 'outfit', 'legendary', '🛡️', 'xp_boost', 0.15, 'XP 획득량 +15%', 'achievement', 0, false, 15, false),
  ('비 오는 날 우비', '빗속에서 3번 탐험한 자의 증표', 'outfit', 'rare', '🌧️', 'cosmetic_only', 0, NULL, 'special', 0, false, 1, false),
  ('야행성 후드', '밤을 5번 탐험한 올빼미의 옷', 'outfit', 'rare', '🌙', 'discovery_range', 80, '야간 탐색 +80m', 'special', 0, false, 1, false),
  ('성수동 한정 재킷', '성수동 10회 탐험 달성 기념', 'outfit', 'epic', '🏙️', 'xp_boost', 0.08, 'XP 획득량 +8%', 'event', 0, false, 1, true),
  ('탐험가 조끼', '기능적이고 실용적인 조끼', 'outfit', 'common', '🦺', 'cosmetic_only', 0, NULL, 'purchase', 150, false, 1, false)
ON CONFLICT DO NOTHING;

-- ── 코스메틱: accessory (6) ─────────────────────────────────────────────────

INSERT INTO character_cosmetics (name, description, slot, rarity, preview_emoji, effect_type, effect_value, effect_description, unlock_method, coin_price, is_premium, min_level, is_limited) VALUES
  ('나침반 목걸이', '길을 잃지 않는 탐험가의 보물', 'accessory', 'common', '🧭', 'discovery_range', 30, '탐색 범위 +30m', 'purchase', 100, false, 1, false),
  ('마법 지팡이', '경험을 더 깊게 만드는 힘', 'accessory', 'rare', '🪄', 'xp_boost', 0.05, 'XP 획득량 +5%', 'purchase', 300, false, 5, false),
  ('쌍안경', '멀리 있는 것도 놓치지 않는 눈', 'accessory', 'epic', '🔭', 'discovery_range', 200, '탐색 범위 +200m', 'purchase', 1200, false, 10, false),
  ('황금 열쇠', '모든 지역 칭호를 모은 자의 열쇠', 'accessory', 'legendary', '🔑', 'coin_bonus', 0.2, '코인 획득량 +20%', 'achievement', 0, false, 1, false),
  ('사진기', '사진 미션 10회 달성 기념', 'accessory', 'rare', '📷', 'cosmetic_only', 0, NULL, 'special', 0, false, 1, false),
  ('책', '퀴즈 정답 20회 달성의 증표', 'accessory', 'rare', '📚', 'cosmetic_only', 0, NULL, 'special', 0, false, 1, false)
ON CONFLICT DO NOTHING;

-- ── 코스메틱: background (4) ────────────────────────────────────────────────

INSERT INTO character_cosmetics (name, description, slot, rarity, preview_emoji, effect_type, effect_value, effect_description, unlock_method, coin_price, is_premium, min_level, is_limited) VALUES
  ('벚꽃 배경', '봄 시즌 한정 배경', 'background', 'rare', '🌸', 'cosmetic_only', 0, NULL, 'season', 0, false, 1, true),
  ('밤하늘 배경', '은하수가 흐르는 밤하늘', 'background', 'epic', '🌌', 'cosmetic_only', 0, NULL, 'purchase', 800, false, 5, false),
  ('오로라 배경', '50회 탐험 달성 기념 배경', 'background', 'legendary', '🌈', 'cosmetic_only', 0, NULL, 'achievement', 0, false, 1, false),
  ('도시 야경 배경', '밤 이벤트 10회 달성 기념', 'background', 'rare', '🌃', 'cosmetic_only', 0, NULL, 'special', 0, false, 1, false)
ON CONFLICT DO NOTHING;

-- ── 코스메틱: aura (4) ──────────────────────────────────────────────────────

INSERT INTO character_cosmetics (name, description, slot, rarity, preview_emoji, effect_type, effect_value, effect_description, unlock_method, coin_price, is_premium, min_level, is_limited) VALUES
  ('반짝이 효과', '은은한 빛이 따라다니는 효과', 'aura', 'common', '✨', 'cosmetic_only', 0, NULL, 'purchase', 200, false, 1, false),
  ('불꽃 효과', '열정의 불꽃이 감싸는 효과', 'aura', 'rare', '🔥', 'xp_boost', 0.03, 'XP 획득량 +3%', 'purchase', 500, false, 5, false),
  ('얼음 효과', '스트릭이 끊어지지 않는 보호막', 'aura', 'epic', '❄️', 'streak_shield', 1, '스트릭 보호 1회', 'purchase', 1500, false, 10, false),
  ('무지개 효과', '모든 것을 빛나게 만드는 오라', 'aura', 'legendary', '🌈', 'xp_boost', 0.1, 'XP +10% & 코인 +10%', 'purchase', 4000, false, 20, false)
ON CONFLICT DO NOTHING;

-- ── 칭호 20개 ──────────────────────────────────────────────────────────────

INSERT INTO character_titles (name, description, rarity, unlock_condition, category, icon_emoji) VALUES
  ('첫 발자국', '첫 번째 탐험을 완료했다', 'common', '{"type":"total_events","count":1}', 'exploration', '👣'),
  ('열 번째 발견', '10번의 탐험을 완료했다', 'common', '{"type":"total_events","count":10}', 'exploration', '🔍'),
  ('50가지 이야기', '50번의 탐험을 완료했다', 'rare', '{"type":"total_events","count":50}', 'exploration', '📖'),
  ('백전백승 탐험가', '100번의 탐험을 완료했다', 'epic', '{"type":"total_events","count":100}', 'achievement', '🏆'),
  ('성수동의 수호자', '성수동에서 10회 탐험 완료', 'rare', '{"type":"district_events","district":"성수","count":10}', 'district', '🏙️'),
  ('홍대의 모험가', '홍대에서 10회 탐험 완료', 'rare', '{"type":"district_events","district":"홍대","count":10}', 'district', '🎨'),
  ('강남의 개척자', '강남에서 10회 탐험 완료', 'rare', '{"type":"district_events","district":"강남","count":10}', 'district', '💼'),
  ('야행성 탐험가', '밤에 5회 이상 탐험 완료', 'rare', '{"type":"night_events","count":5}', 'exploration', '🦉'),
  ('새벽의 방랑자', '밤에 20회 이상 탐험 완료', 'epic', '{"type":"night_events","count":20}', 'exploration', '🌙'),
  ('비를 좋아하는 사람', '비 오는 날 3회 탐험 완료', 'rare', '{"type":"rain_events","count":3}', 'exploration', '🌧️'),
  ('폭풍 속의 탐험가', '비 오는 날 10회 탐험 완료', 'epic', '{"type":"rain_events","count":10}', 'achievement', '⛈️'),
  ('사진 애호가', '사진 미션 10회 완료', 'rare', '{"type":"photo_missions","count":10}', 'achievement', '📷'),
  ('박학다식', '퀴즈 정답률 90% 이상 (최소 20문제)', 'rare', '{"type":"quiz_accuracy","min_rate":0.9,"min_count":20}', 'achievement', '🎓'),
  ('7일 연속 불꽃', '7일 연속 로그인', 'common', '{"type":"streak","days":7}', 'achievement', '🔥'),
  ('30일 전설', '30일 연속 로그인', 'epic', '{"type":"streak","days":30}', 'achievement', '👑'),
  ('마라토너', '총 탐험 거리 100km 달성', 'epic', '{"type":"distance_km","min":100}', 'exploration', '🏃'),
  ('장거리 러너', '총 탐험 거리 50km 달성', 'rare', '{"type":"distance_km","min":50}', 'exploration', '🚶'),
  ('만렙 탐험가', '캐릭터 레벨 30 달성', 'legendary', '{"type":"level","min":30}', 'achievement', '⭐'),
  ('초기 탐험가', '베타 시즌의 전설적인 탐험가', 'legendary', '{"type":"total_events","count":1}', 'season', '🌟'),
  ('사계절 정복자', '모든 시즌 이벤트를 경험한 자', 'legendary', '{"type":"total_events","count":100}', 'season', '🌍')
ON CONFLICT DO NOTHING;
