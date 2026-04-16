-- ============================================================================
-- WhereHere: Economy Rebalance 
-- (걸음 수 보상 하향 및 일일 연속 출석 7일 코인 50 -> 30 하향)
-- ============================================================================

-- 1. 걸음 수 마일스톤 보상 조정 (claim_daily_step_reward 하향 조정)
CREATE OR REPLACE FUNCTION public.claim_daily_step_reward(
  p_user_id uuid,
  p_milestone_steps int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp int := 0;
  v_coins int := 0;
  v_badge_id uuid;
BEGIN
  -- 보상 조정 (1000보, 3000보는 초기 달성 경험치 강화. 코인은 고단계에서만 적정량 지급)
  IF p_milestone_steps = 1000 THEN
    v_xp := 10; v_coins := 0;
  ELSIF p_milestone_steps = 3000 THEN
    v_xp := 20; v_coins := 0;
  ELSIF p_milestone_steps = 5000 THEN
    v_xp := 30; v_coins := 5;
  ELSIF p_milestone_steps = 10000 THEN
    v_xp := 50; v_coins := 15;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_milestone');
  END IF;

  INSERT INTO public.daily_step_rewards (
    user_id, reward_date, milestone_steps, xp_awarded, coins_awarded
  )
  VALUES (
    p_user_id, CURRENT_DATE, p_milestone_steps, v_xp, v_coins
  )
  ON CONFLICT (user_id, reward_date, milestone_steps) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  UPDATE public.profiles
  SET total_xp = COALESCE(total_xp, 0) + v_xp,
      coins = COALESCE(coins, 0) + v_coins
  WHERE id = p_user_id;

  -- 1만보 달성 뱃지 로직
  IF p_milestone_steps = 10000 THEN
    INSERT INTO public.badges (
      name, description, category, rarity, requirement_type, requirement_value
    )
    VALUES (
      '만보기',
      '하루 10,000보를 달성했습니다.',
      'achievement',
      'rare',
      'daily_steps',
      '{"min":10000}'::jsonb
    )
    ON CONFLICT (name) DO NOTHING;

    SELECT id INTO v_badge_id FROM public.badges WHERE name = '만보기' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', v_xp,
    'coins_awarded', v_coins,
    'milestone_steps', p_milestone_steps
  );
END;
$$;

-- 2. 7일 연속 출석 코인 보상 하향 (50 -> 30) (claim_daily_reward 수정)
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
    -- 변경점: 50에서 30으로 하향 조정
    v_total_coins := v_total_coins + 30;
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
      WHEN v_bonus_type = 'streak_7' THEN '🔥 7일 연속 출석! 보너스 100 XP + 30 코인!'
      WHEN v_bonus_type = 'streak_30' THEN '🏆 30일 연속 출석! 보너스 500 XP + 200 코인!'
      WHEN v_bonus_type = 'streak_100' THEN '👑 100일 연속 출석! 전설의 보너스 2000 XP + 1000 코인!'
      WHEN v_new_streak > 1 THEN v_new_streak || '일 연속 출석! +' || v_streak_bonus || ' 보너스 XP + ' || v_total_coins || ' 코인'
      ELSE '오늘의 보상을 받았습니다! +' || v_total_coins || ' 코인'
    END
  );
END;
$$;
