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

const CATEGORY_KO: Record<string, string> = {
  exploration: "탐험",
  photo: "포토 스팟",
  quiz: "퀴즈 산책",
  partnership: "파트너 연계",
};

function buildPrompt(
  title: string,
  address: string,
  category: string,
  district: string,
): string {
  return `You are a storyteller for WhereHere, a location-based exploration app in Korea.
Create an engaging, mysterious narrative for this location:
- Place: ${title} (${address})
- Category: ${CATEGORY_KO[category] ?? category}
- District: ${district}

Write in Korean. Keep it 2-3 sentences. Make it feel like the start of an adventure.
Tone: mysterious, inviting, slightly magical. Reference real local features when possible.`;
}

async function callClaude(apiKey: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Claude API error:", res.status, err);
    return null;
  }

  const data = await res.json();
  return data?.content?.[0]?.text?.trim() ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "인증 실패" }, 401);

    const { event_id } = await req.json();
    if (!event_id) return json({ error: "event_id가 필요합니다." }, 400);

    // ── 1. 이벤트 조회 ──────────────────────────────────────────────
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("title, address, district, category, narrative")
      .eq("id", event_id)
      .single();

    if (eventErr || !event) {
      return json({ error: "이벤트를 찾을 수 없습니다." }, 404);
    }

    // ── 2. 캐시 확인 ────────────────────────────────────────────────
    if (event.narrative) {
      return json({ narrative: event.narrative, cached: true });
    }

    // ── 3. Claude API 호출 ──────────────────────────────────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return json({ error: "서사를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
    }

    const prompt = buildPrompt(
      event.title,
      event.address ?? "",
      event.category,
      event.district ?? "서울",
    );

    const narrative = await callClaude(apiKey, prompt);

    if (!narrative) {
      return json({ error: "서사를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
    }

    // ── 4. DB에 캐싱 ────────────────────────────────────────────────
    await supabase
      .from("events")
      .update({ narrative })
      .eq("id", event_id);

    // ── 5. 반환 ─────────────────────────────────────────────────────
    return json({ narrative, cached: false });
  } catch (err) {
    console.error("generate-narrative error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
