SET search_path = public, extensions;

-- Seasons table: defines each season
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  theme_color text DEFAULT '#2DD4A8',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT false,
  reward_track jsonb NOT NULL DEFAULT '[]'::jsonb,
  premium_reward_track jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seasons_active_idx ON public.seasons (is_active) WHERE is_active = true;

-- Season pass ownership
CREATE TABLE IF NOT EXISTS public.season_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  is_premium boolean DEFAULT false,
  current_level integer DEFAULT 0,
  season_xp integer DEFAULT 0,
  claimed_rewards jsonb DEFAULT '[]'::jsonb,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE INDEX season_passes_user_idx ON public.season_passes (user_id);
CREATE INDEX season_passes_season_idx ON public.season_passes (season_id);

-- RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active seasons" ON public.seasons
  FOR SELECT USING (true);

CREATE POLICY "Users can view own season passes" ON public.season_passes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own season pass" ON public.season_passes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own season pass" ON public.season_passes
  FOR UPDATE USING (auth.uid() = user_id);

-- RPC: Get current active season with user's progress
CREATE OR REPLACE FUNCTION public.get_active_season(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_season RECORD;
  v_pass RECORD;
  v_result jsonb;
BEGIN
  SELECT * INTO v_season FROM public.seasons
    WHERE is_active = true AND now() BETWEEN start_date AND end_date
    ORDER BY start_date DESC LIMIT 1;

  IF v_season IS NULL THEN
    RETURN jsonb_build_object('has_active_season', false);
  END IF;

  SELECT * INTO v_pass FROM public.season_passes
    WHERE user_id = p_user_id AND season_id = v_season.id;

  -- Auto-create free pass if not exists
  IF v_pass IS NULL THEN
    INSERT INTO public.season_passes (user_id, season_id, is_premium, current_level, season_xp)
    VALUES (p_user_id, v_season.id, false, 0, 0)
    RETURNING * INTO v_pass;
  END IF;

  RETURN jsonb_build_object(
    'has_active_season', true,
    'season', jsonb_build_object(
      'id', v_season.id,
      'name', v_season.name,
      'description', v_season.description,
      'theme_color', v_season.theme_color,
      'start_date', v_season.start_date,
      'end_date', v_season.end_date,
      'reward_track', v_season.reward_track,
      'premium_reward_track', v_season.premium_reward_track
    ),
    'pass', jsonb_build_object(
      'id', v_pass.id,
      'is_premium', v_pass.is_premium,
      'current_level', v_pass.current_level,
      'season_xp', v_pass.season_xp,
      'claimed_rewards', v_pass.claimed_rewards
    ),
    'days_remaining', GREATEST(0, EXTRACT(DAY FROM v_season.end_date - now())::integer)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_season(uuid) TO authenticated;

-- RPC: Add season XP and level up
CREATE OR REPLACE FUNCTION public.add_season_xp(p_user_id uuid, p_xp integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season_id uuid;
  v_pass RECORD;
  v_new_xp integer;
  v_new_level integer;
  v_xp_per_level integer := 200;
  v_max_level integer := 30;
  v_leveled_up boolean := false;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons
    WHERE is_active = true AND now() BETWEEN start_date AND end_date
    LIMIT 1;

  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_season');
  END IF;

  SELECT * INTO v_pass FROM public.season_passes
    WHERE user_id = p_user_id AND season_id = v_season_id;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pass');
  END IF;

  v_new_xp := v_pass.season_xp + p_xp;
  v_new_level := LEAST(v_new_xp / v_xp_per_level, v_max_level);
  v_leveled_up := v_new_level > v_pass.current_level;

  UPDATE public.season_passes
  SET season_xp = v_new_xp, current_level = v_new_level
  WHERE id = v_pass.id;

  RETURN jsonb_build_object(
    'success', true,
    'season_xp', v_new_xp,
    'current_level', v_new_level,
    'leveled_up', v_leveled_up,
    'xp_to_next', (v_new_level + 1) * v_xp_per_level - v_new_xp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_season_xp(uuid, integer) TO authenticated;

-- RPC: Claim season reward
CREATE OR REPLACE FUNCTION public.claim_season_reward(p_user_id uuid, p_level integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_season RECORD;
  v_reward jsonb;
  v_is_premium_reward boolean := false;
  v_claimed jsonb;
BEGIN
  SELECT sp.*, s.reward_track, s.premium_reward_track
  INTO v_pass
  FROM public.season_passes sp
  JOIN public.seasons s ON s.id = sp.season_id
  WHERE sp.user_id = p_user_id AND s.is_active = true
  LIMIT 1;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pass');
  END IF;

  IF v_pass.current_level < p_level THEN
    RETURN jsonb_build_object('success', false, 'reason', 'level_not_reached');
  END IF;

  -- Check if already claimed
  IF v_pass.claimed_rewards ? p_level::text THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  -- Find reward from track
  SELECT elem INTO v_reward
  FROM jsonb_array_elements(v_pass.reward_track) elem
  WHERE (elem->>'level')::integer = p_level;

  -- Update claimed
  v_claimed := v_pass.claimed_rewards || to_jsonb(p_level::text);
  UPDATE public.season_passes SET claimed_rewards = v_claimed
  WHERE id = v_pass.id;

  -- Award XP bonus
  IF v_reward IS NOT NULL AND (v_reward->>'xp') IS NOT NULL THEN
    UPDATE public.profiles
    SET total_xp = total_xp + (v_reward->>'xp')::integer
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'is_premium', v_is_premium_reward,
    'claimed_rewards', v_claimed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_season_reward(uuid, integer) TO authenticated;

-- Seed: First season (Spring 2026)
INSERT INTO public.seasons (name, description, theme_color, start_date, end_date, is_active, reward_track, premium_reward_track)
VALUES (
  '봄의 탐험가',
  '서울의 봄을 탐험하고 특별한 보상을 획득하세요!',
  '#F472B6',
  '2026-03-01T00:00:00+09:00',
  '2026-04-30T23:59:59+09:00',
  true,
  '[
    {"level": 1, "type": "xp", "xp": 50, "label": "50 XP"},
    {"level": 3, "type": "xp", "xp": 100, "label": "100 XP"},
    {"level": 5, "type": "badge", "badge_name": "봄 탐험 초보", "label": "봄 탐험 초보 배지"},
    {"level": 7, "type": "xp", "xp": 150, "label": "150 XP"},
    {"level": 10, "type": "badge", "badge_name": "벚꽃 수집가", "label": "벚꽃 수집가 배지"},
    {"level": 13, "type": "xp", "xp": 200, "label": "200 XP"},
    {"level": 15, "type": "badge", "badge_name": "봄바람 여행자", "label": "봄바람 여행자 배지"},
    {"level": 18, "type": "xp", "xp": 300, "label": "300 XP"},
    {"level": 20, "type": "badge", "badge_name": "시즌 마스터", "label": "시즌 마스터 배지"},
    {"level": 25, "type": "xp", "xp": 500, "label": "500 XP"},
    {"level": 30, "type": "badge", "badge_name": "전설의 봄 탐험가", "label": "전설의 봄 탐험가 배지"}
  ]'::jsonb,
  '[
    {"level": 2, "type": "skin", "skin_id": "spring_dodam", "label": "봄 도담 스킨"},
    {"level": 5, "type": "xp", "xp": 200, "label": "200 XP (프리미엄)"},
    {"level": 8, "type": "skin", "skin_id": "cherry_blossom", "label": "벚꽃 테마"},
    {"level": 12, "type": "xp", "xp": 300, "label": "300 XP (프리미엄)"},
    {"level": 15, "type": "skin", "skin_id": "spring_wind", "label": "봄바람 이펙트"},
    {"level": 20, "type": "xp", "xp": 500, "label": "500 XP (프리미엄)"},
    {"level": 25, "type": "skin", "skin_id": "golden_petals", "label": "황금 꽃잎 이펙트"},
    {"level": 30, "type": "skin", "skin_id": "legendary_spring", "label": "전설의 봄 장비"}
  ]'::jsonb
);
