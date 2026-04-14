import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const COIN_PRODUCTS: Record<string, number> = {
  wh_coins_500: 500,
  /** ASC에서 `wh_coins_500` ID 충돌 시 쓰는 대체 SKU — 앱 `resolveAppleStoreCoinProductId`와 동일 문자열 */
  wh_coins_500_pack: 500,
  wh_coins_1200: 1200,
  wh_coins_3500: 3500,
  wh_coins_8000: 8000,
  wh_coins_20000: 20000,
};

const PRICE_KRW: Record<string, number> = {
  wh_coins_500: 1100,
  wh_coins_500_pack: 1100,
  wh_coins_1200: 2200,
  wh_coins_3500: 5500,
  wh_coins_8000: 11000,
  wh_coins_20000: 22000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const {
      product_id,
      transaction_id,
      platform,
      type,
    } = body as {
      product_id: string;
      transaction_id?: string;
      platform?: string;
      type: "coins" | "premium" | "season_pass";
    };

    if (type === "coins") {
      const coins = COIN_PRODUCTS[product_id];
      if (!coins) return json({ error: "invalid_product" }, 400);

      const { data, error } = await supabaseAdmin.rpc("verify_coin_purchase", {
        p_user_id: user.id,
        p_product_id: product_id,
        p_coins: coins,
        p_price_krw: PRICE_KRW[product_id] ?? 0,
        p_rc_transaction_id: transaction_id ?? null,
        p_platform: platform ?? "ios",
      });

      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (type === "premium") {
      const plan = product_id === "wh_premium_monthly" ? "monthly" : "annual";
      const expiresAt =
        plan === "monthly"
          ? new Date(Date.now() + 30 * 86400000).toISOString()
          : new Date(Date.now() + 365 * 86400000).toISOString();

      const { data, error } = await supabaseAdmin.rpc("activate_premium", {
        p_user_id: user.id,
        p_plan: plan,
        p_rc_transaction_id: transaction_id ?? null,
        p_expires_at: expiresAt,
      });

      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (type === "season_pass") {
      const { data, error } = await supabaseAdmin.rpc("activate_premium", {
        p_user_id: user.id,
        p_plan: "season_pass",
        p_rc_transaction_id: transaction_id ?? null,
        p_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });

      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    return json({ error: "invalid_type" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
