-- ================================================================
-- 코인 경제 + RevenueCat 인앱 결제 마이그레이션
-- ================================================================

-- 1. 코인 구매 내역 (RevenueCat 영수증 검증 후 기록)
CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  coins_granted int NOT NULL CHECK (coins_granted > 0),
  price_krw int NOT NULL DEFAULT 0,
  rc_transaction_id text UNIQUE,
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON coin_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_rc_txn ON coin_purchases(rc_transaction_id);

ALTER TABLE coin_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON coin_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 2. 프리미엄 구독 내역
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'annual', 'season_pass')),
  rc_transaction_id text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_subs_user ON premium_subscriptions(user_id);

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON premium_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. 친구 초대 보상 추적 (중복 방지)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins_granted int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inviter_id, invitee_id)
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referral_rewards FOR SELECT
  USING (auth.uid() = inviter_id);

-- ================================================================
-- RPC: verify_coin_purchase — Edge Function에서 호출
-- 영수증 검증 후 코인 지급 (중복 방지: rc_transaction_id UNIQUE)
-- ================================================================
CREATE OR REPLACE FUNCTION public.verify_coin_purchase(
  p_user_id uuid,
  p_product_id text,
  p_coins int,
  p_price_krw int DEFAULT 0,
  p_rc_transaction_id text DEFAULT NULL,
  p_platform text DEFAULT 'ios'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_coins int;
BEGIN
  IF p_rc_transaction_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM coin_purchases WHERE rc_transaction_id = p_rc_transaction_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'duplicate_transaction');
    END IF;
  END IF;

  INSERT INTO coin_purchases (user_id, product_id, coins_granted, price_krw, rc_transaction_id, platform)
  VALUES (p_user_id, p_product_id, p_coins, p_price_krw, p_rc_transaction_id, p_platform);

  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_coins
  WHERE id = p_user_id
  RETURNING coins INTO v_new_coins;

  RETURN jsonb_build_object(
    'success', true,
    'coins_granted', p_coins,
    'total_coins', v_new_coins
  );
END;
$$;

-- ================================================================
-- RPC: activate_premium — Edge Function에서 구독 활성화
-- ================================================================
CREATE OR REPLACE FUNCTION public.activate_premium(
  p_user_id uuid,
  p_plan text,
  p_rc_transaction_id text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE premium_subscriptions
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true AND plan = p_plan;

  INSERT INTO premium_subscriptions (user_id, plan, rc_transaction_id, expires_at)
  VALUES (p_user_id, p_plan, p_rc_transaction_id, p_expires_at);

  UPDATE profiles SET is_premium = true WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- RPC: deactivate_premium — RevenueCat 웹훅에서 만료 시 호출
-- ================================================================
CREATE OR REPLACE FUNCTION public.deactivate_premium(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE premium_subscriptions
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  UPDATE profiles SET is_premium = false WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ================================================================
-- RPC: grant_referral_coins — 친구 초대 보상 (1회만)
-- ================================================================
CREATE OR REPLACE FUNCTION public.grant_referral_coins(
  p_inviter_id uuid,
  p_invitee_id uuid,
  p_coins int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_coins int;
BEGIN
  IF p_inviter_id = p_invitee_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  INSERT INTO referral_rewards (inviter_id, invitee_id, coins_granted)
  VALUES (p_inviter_id, p_invitee_id, p_coins)
  ON CONFLICT (inviter_id, invitee_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_rewarded');
  END IF;

  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_coins
  WHERE id = p_inviter_id
  RETURNING coins INTO v_new_coins;

  RETURN jsonb_build_object(
    'success', true,
    'coins_granted', p_coins,
    'total_coins', v_new_coins
  );
END;
$$;

-- ================================================================
-- RPC: grant_checkin_coins — 체크인 시 +3 코인
-- (verify_and_create_checkin이 이미 코인을 줄 수도 있음; 별도 보너스)
-- ================================================================
CREATE OR REPLACE FUNCTION public.grant_checkin_coins(p_user_id uuid, p_coins int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_coins int;
BEGIN
  UPDATE profiles
  SET coins = COALESCE(coins, 0) + p_coins
  WHERE id = p_user_id
  RETURNING coins INTO v_new_coins;

  RETURN jsonb_build_object('success', true, 'coins_granted', p_coins, 'total_coins', v_new_coins);
END;
$$;

-- ================================================================
-- 코인 팩 상품 정의 (클라이언트 참조용)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.coin_products (
  id text PRIMARY KEY,
  coins int NOT NULL,
  price_krw int NOT NULL,
  label text NOT NULL,
  badge text,
  sort_order int NOT NULL DEFAULT 0
);

INSERT INTO coin_products (id, coins, price_krw, label, badge, sort_order) VALUES
  ('wh_coins_500',   500,   1100,  '500 코인',    NULL,       1),
  ('wh_coins_1200',  1200,  2200,  '1,200 코인',  '가성비',    2),
  ('wh_coins_3500',  3500,  5500,  '3,500 코인',  NULL,       3),
  ('wh_coins_8000',  8000,  11000, '8,000 코인',  NULL,       4),
  ('wh_coins_20000', 20000, 22000, '20,000 코인', '최고 가성비', 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE coin_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read coin products"
  ON coin_products FOR SELECT
  USING (true);

-- Revoke direct write access
REVOKE INSERT, UPDATE, DELETE ON coin_purchases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON premium_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON referral_rewards FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON coin_products FROM anon, authenticated;
