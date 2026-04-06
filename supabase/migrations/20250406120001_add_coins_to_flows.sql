-- ============================================================================
-- WhereHere: 기존 흐름에 코인 보상 추가
-- 일일 보상, 체크인, 퀴즈 정답에 코인 지급
-- ============================================================================

-- ── 1. 일일 보상에 코인 추가 ─────────────────────────────────────────────

ALTER TABLE daily_rewards ADD COLUMN IF NOT EXISTS coins_earned INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_yesterday date := CURRENT_DATE - 1;
  v_existing_id uuid;
  v_prev_streak integer;
  v_new_streak integer;
  v_base_xp integer := 20;
  v_streak_bonus integer := 0;
  v_total_xp integer;
  v_bonus_type text := NULL;
  v_reward_id uuid;
  v_base_coins integer := 10;
  v_total_coins integer;
BEGIN
  -- Already claimed today?
  SELECT id INTO v_existing_id
  FROM public.daily_rewards
  WHERE user_id = p_user_id AND reward_date = v_today;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_claimed', true,
      'message', '오늘의 보상은 이미 받았습니다!'
    );
  END IF;

  -- Get yesterday's streak
  SELECT streak_day INTO v_prev_streak
  FROM public.daily_rewards
  WHERE user_id = p_user_id AND reward_date = v_yesterday;

  IF v_prev_streak IS NOT NULL THEN
    v_new_streak := v_prev_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Calculate XP
  v_streak_bonus := LEAST(v_new_streak * 5, 100);
  v_total_xp := v_base_xp + v_streak_bonus;

  -- Calculate coins
  v_total_coins := v_base_coins;

  -- Milestone bonuses
  IF v_new_streak = 7 THEN
    v_bonus_type := 'streak_7';
    v_total_xp := v_total_xp + 100;
    v_total_coins := v_total_coins + 50;
  ELSIF v_new_streak = 30 THEN
    v_bonus_type := 'streak_30';
    v_total_xp := v_total_xp + 500;
    v_total_coins := v_total_coins + 200;
  ELSIF v_new_streak = 100 THEN
    v_bonus_type := 'streak_100';
    v_total_xp := v_total_xp + 2000;
    v_total_coins := v_total_coins + 1000;
  ELSIF v_new_streak % 7 = 0 THEN
    v_total_xp := v_total_xp + 50;
    v_total_coins := v_total_coins + 25;
  END IF;

  -- Insert daily reward record
  INSERT INTO public.daily_rewards (user_id, reward_date, xp_earned, streak_day, bonus_type, coins_earned)
  VALUES (p_user_id, v_today, v_total_xp, v_new_streak, v_bonus_type, v_total_coins)
  RETURNING id INTO v_reward_id;

  -- Update profile XP, streak, and coins
  UPDATE public.profiles
  SET total_xp = total_xp + v_total_xp,
      login_streak = v_new_streak,
      coins = COALESCE(coins, 0) + v_total_coins,
      updated_at = now()
  WHERE id = p_user_id;

  -- Update character XP
  UPDATE public.characters
  SET xp = xp + v_total_xp
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'already_claimed', false,
    'reward_id', v_reward_id,
    'streak_day', v_new_streak,
    'xp_earned', v_total_xp,
    'coins_earned', v_total_coins,
    'base_xp', v_base_xp,
    'streak_bonus', v_streak_bonus,
    'bonus_type', v_bonus_type,
    'message', CASE
      WHEN v_bonus_type = 'streak_7' THEN '🔥 7일 연속 출석! 보너스 100 XP + 50 코인!'
      WHEN v_bonus_type = 'streak_30' THEN '🏆 30일 연속 출석! 보너스 500 XP + 200 코인!'
      WHEN v_bonus_type = 'streak_100' THEN '👑 100일 연속 출석! 전설의 보너스 2000 XP + 1000 코인!'
      WHEN v_new_streak > 1 THEN v_new_streak || '일 연속 출석! +' || v_streak_bonus || ' 보너스 XP + ' || v_total_coins || ' 코인'
      ELSE '오늘의 보상을 받았습니다! +' || v_total_coins || ' 코인'
    END
  );
END;
$$;

-- ── 2. 체크인에 코인 추가 ────────────────────────────────────────────────

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
  v_radius double precision := 100;
  v_checkin_id uuid;
  v_coin_reward integer := 3;
BEGIN
  SELECT location INTO v_event_loc
  FROM public.events
  WHERE id = p_event_id AND is_active = true;

  IF v_event_loc IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', 0,
      'message', '이벤트를 찾을 수 없습니다.',
      'checkin_id', null,
      'coins_earned', 0
    );
  END IF;

  v_checkin_loc := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_distance := st_distance(v_event_loc, v_checkin_loc);

  IF v_distance > v_radius THEN
    RETURN jsonb_build_object(
      'success', false,
      'distance_meters', round(v_distance::numeric, 1),
      'message', format('이벤트 장소에서 %sm 떨어져 있습니다. %sm 이내로 이동해주세요.', round(v_distance::numeric, 0), v_radius),
      'checkin_id', null,
      'coins_earned', 0
    );
  END IF;

  INSERT INTO public.checkins (user_id, event_id, location, verified)
  VALUES (p_user_id, p_event_id, v_checkin_loc, true)
  RETURNING id INTO v_checkin_id;

  -- 코인 지급
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + v_coin_reward
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'distance_meters', round(v_distance::numeric, 1),
    'message', '체크인 성공! +' || v_coin_reward || ' 🪙',
    'checkin_id', v_checkin_id,
    'coins_earned', v_coin_reward
  );
END;
$$;

-- ── 3. 퀴즈 정답 코인 보상 함수 ──────────────────────────────────────────
-- 퀴즈 미션 완료 시 호출할 수 있는 함수

CREATE OR REPLACE FUNCTION public.grant_quiz_coins(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + 5
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_quiz_coins(uuid) TO authenticated, service_role;
