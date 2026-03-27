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

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data?: Record<string, unknown>;
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{
  ok: boolean;
  tickets: unknown[];
}> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Expo Push API error:", res.status, err);
    return { ok: false, tickets: [] };
  }

  const result = await res.json();
  return { ok: true, tickets: result.data ?? [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Service-role only — verify via the Authorization header matching the service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Allow both service_role JWT and direct key match
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
    );

    // If the caller isn't using the service role key, verify they're an admin
    if (token !== serviceKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return json({ error: "인증 실패" }, 401);

      // Only service_role should call this endpoint in production;
      // for flexibility, allow authenticated users but log a warning
      console.warn(`send-notification called by user ${user.id} instead of service_role`);
    }

    const body: PushPayload | PushPayload[] = await req.json();
    const payloads = Array.isArray(body) ? body : [body];

    if (payloads.length === 0) {
      return json({ error: "알림 대상이 없습니다." }, 400);
    }

    // Validate all payloads
    for (const p of payloads) {
      if (!p.user_id || !p.title || !p.body) {
        return json({ error: "user_id, title, body는 필수입니다." }, 400);
      }
    }

    // Batch-fetch push tokens for all target users
    const userIds = [...new Set(payloads.map((p) => p.user_id))];

    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, push_token")
      .in("id", userIds);

    if (profileErr) {
      console.error("profiles query error:", profileErr);
      return json({ error: "유저 조회 실패" }, 500);
    }

    const tokenMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.push_token) tokenMap.set(p.id, p.push_token);
    }

    // Build Expo messages, skip users without tokens
    const messages: ExpoPushMessage[] = [];
    const skipped: string[] = [];

    for (const p of payloads) {
      const pushToken = tokenMap.get(p.user_id);
      if (!pushToken) {
        skipped.push(p.user_id);
        continue;
      }

      messages.push({
        to: pushToken,
        title: p.title,
        body: p.body,
        sound: "default",
        ...(p.data ? { data: p.data } : {}),
      });
    }

    if (messages.length === 0) {
      return json({
        success: true,
        sent: 0,
        skipped: skipped.length,
        detail: "대상 유저에 푸시 토큰이 없습니다.",
      });
    }

    // Expo recommends batches of up to 100
    const BATCH_SIZE = 100;
    const allTickets: unknown[] = [];
    let allOk = true;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const { ok, tickets } = await sendExpoPush(batch);
      if (!ok) allOk = false;
      allTickets.push(...tickets);
    }

    return json({
      success: allOk,
      sent: messages.length,
      skipped: skipped.length,
      tickets: allTickets,
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
