-- WhereHere: Daily rewards & login streak system
-- Tracks daily check-ins and provides escalating streak bonuses.

SET search_path = public, extensions;

--------------------------------------------------------------------------------
-- DAILY REWARDS TABLE
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reward_date date NOT NULL DEFAULT CURRENT_DATE,
  xp_earned integer NOT NULL DEFAULT 0,
  streak_day integer NOT NULL DEFAULT 1,
  bonus_type text, -- 'streak_7', 'streak_30', 'streak_100', null
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_date)
);

CREATE INDEX daily_rewards_user_id_idx ON public.daily_rewards (user_id);
CREATE INDEX daily_rewards_date_idx ON public.daily_rewards (reward_date DESC);

--------------------------------------------------------------------------------
-- RLS
--------------------------------------------------------------------------------

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily rewards"
  ON public.daily_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can claim own daily reward"
  ON public.daily_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- CLAIM DAILY REWARD RPC
--------------------------------------------------------------------------------

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

  -- Calculate XP: base + streak bonus
  v_streak_bonus := LEAST(v_new_streak * 5, 100); -- cap at +100
  v_total_xp := v_base_xp + v_streak_bonus;

  -- Milestone bonuses
  IF v_new_streak = 7 THEN
    v_bonus_type := 'streak_7';
    v_total_xp := v_total_xp + 100;
  ELSIF v_new_streak = 30 THEN
    v_bonus_type := 'streak_30';
    v_total_xp := v_total_xp + 500;
  ELSIF v_new_streak = 100 THEN
    v_bonus_type := 'streak_100';
    v_total_xp := v_total_xp + 2000;
  ELSIF v_new_streak % 7 = 0 THEN
    v_total_xp := v_total_xp + 50; -- weekly bonus
  END IF;

  -- Insert daily reward record
  INSERT INTO public.daily_rewards (user_id, reward_date, xp_earned, streak_day, bonus_type)
  VALUES (p_user_id, v_today, v_total_xp, v_new_streak, v_bonus_type)
  RETURNING id INTO v_reward_id;

  -- Update profile XP and streak
  UPDATE public.profiles
  SET total_xp = total_xp + v_total_xp,
      login_streak = v_new_streak,
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
    'base_xp', v_base_xp,
    'streak_bonus', v_streak_bonus,
    'bonus_type', v_bonus_type,
    'message', CASE
      WHEN v_bonus_type = 'streak_7' THEN '🔥 7일 연속 출석! 보너스 100 XP!'
      WHEN v_bonus_type = 'streak_30' THEN '🏆 30일 연속 출석! 보너스 500 XP!'
      WHEN v_bonus_type = 'streak_100' THEN '👑 100일 연속 출석! 전설의 보너스 2000 XP!'
      WHEN v_new_streak > 1 THEN v_new_streak || '일 연속 출석! +' || v_streak_bonus || ' 보너스 XP'
      ELSE '오늘의 보상을 받았습니다!'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward(uuid) TO authenticated;

--------------------------------------------------------------------------------
-- GET STREAK INFO RPC
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_streak_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_current_streak integer;
  v_claimed_today boolean;
  v_total_days integer;
  v_weekly_progress integer;
  v_next_milestone integer;
  v_next_milestone_bonus integer;
BEGIN
  -- Check if claimed today
  SELECT EXISTS(
    SELECT 1 FROM public.daily_rewards
    WHERE user_id = p_user_id AND reward_date = v_today
  ) INTO v_claimed_today;

  -- Get current streak
  SELECT login_streak INTO v_current_streak
  FROM public.profiles WHERE id = p_user_id;
  v_current_streak := COALESCE(v_current_streak, 0);

  -- Total days ever claimed
  SELECT COUNT(*) INTO v_total_days
  FROM public.daily_rewards WHERE user_id = p_user_id;

  -- Weekly progress (how many days claimed this week, Mon-Sun)
  SELECT COUNT(*) INTO v_weekly_progress
  FROM public.daily_rewards
  WHERE user_id = p_user_id
    AND reward_date >= date_trunc('week', v_today)::date;

  -- Next milestone
  IF v_current_streak < 7 THEN
    v_next_milestone := 7;
    v_next_milestone_bonus := 100;
  ELSIF v_current_streak < 30 THEN
    v_next_milestone := 30;
    v_next_milestone_bonus := 500;
  ELSIF v_current_streak < 100 THEN
    v_next_milestone := 100;
    v_next_milestone_bonus := 2000;
  ELSE
    v_next_milestone := ((v_current_streak / 100) + 1) * 100;
    v_next_milestone_bonus := 2000;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'claimed_today', v_claimed_today,
    'total_days', v_total_days,
    'weekly_progress', v_weekly_progress,
    'next_milestone', v_next_milestone,
    'next_milestone_bonus', v_next_milestone_bonus,
    'days_until_milestone', v_next_milestone - v_current_streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_streak_info(uuid) TO authenticated;
