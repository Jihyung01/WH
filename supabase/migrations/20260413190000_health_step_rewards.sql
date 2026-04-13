-- ================================================================
-- Daily health step rewards
-- ================================================================

CREATE TABLE IF NOT EXISTS public.daily_step_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_date date NOT NULL DEFAULT CURRENT_DATE,
  milestone_steps int NOT NULL CHECK (milestone_steps IN (1000, 3000, 5000, 10000)),
  xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_date, milestone_steps)
);

CREATE INDEX IF NOT EXISTS idx_daily_step_rewards_user_date
  ON public.daily_step_rewards(user_id, reward_date DESC);

ALTER TABLE public.daily_step_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily step rewards" ON public.daily_step_rewards;
CREATE POLICY "Users can view own daily step rewards"
  ON public.daily_step_rewards FOR SELECT
  USING (auth.uid() = user_id);

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
  IF p_milestone_steps = 1000 THEN
    v_xp := 5; v_coins := 0;
  ELSIF p_milestone_steps = 3000 THEN
    v_xp := 15; v_coins := 0;
  ELSIF p_milestone_steps = 5000 THEN
    v_xp := 30; v_coins := 10;
  ELSIF p_milestone_steps = 10000 THEN
    v_xp := 50; v_coins := 30;
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

