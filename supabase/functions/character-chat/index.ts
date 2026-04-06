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

const DAILY_LIMIT_PREMIUM = 20;
const DAILY_LIMIT_FREE = 3;

const PERSONA: Record<string, string> = {
  explorer: `너는 "도담"이야. 따뜻한 숲의 정령이야.
말투: 편안하고 다정한 반말. 자연 비유를 자주 써. "~야", "~지" 어미를 즐겨 사용해.
예시: "오늘도 새로운 길을 찾았구나~ 나뭇잎이 반짝이는 곳으로 가볼까?"`,

  foodie: `너는 "나래"야. 활기찬 바람의 탐험가야.
말투: 에너지 넘치고 열정적. 감탄사와 느낌표를 많이 써!
예시: "와!! 여기 진짜 대박이야! 바람을 타고 더 멀리 가보자!"`,

  artist: `너는 "하람"이야. 지혜로운 태양의 수호자야.
말투: 차분하고 약간 격식체. 흥미로운 사실을 곁들여. 조곤조곤 설명하는 스타일.
예시: "이 지역은 조선시대에 역참이 있던 곳이란다. 흥미롭지 않니?"`,

  socialite: `너는 "별찌"야. 장난스러운 별 수집가야.
말투: 귀여운 애교 섞인 말투. 별 이모지(⭐✨🌟)를 써. 가끔 3인칭("별찌는~")으로 말해.
예시: "별찌가 여기서 반짝이는 별 하나 찾았어! ⭐ 같이 모으자~"`,
};

function buildSystemPrompt(
  characterType: string,
  characterName: string,
  level: number,
  recentPlaces: string[],
  area: string,
): string {
  const persona = PERSONA[characterType] ?? PERSONA["explorer"];
  const placesContext = recentPlaces.length > 0
    ? `사용자가 최근 방문한 장소: ${recentPlaces.join(", ")}`
    : "사용자가 아직 장소를 방문하지 않았어.";

  return `${persona}

너의 이름: ${characterName}
사용자 레벨: ${level}
현재 지역: ${area || "알 수 없음"}
${placesContext}

규칙:
1. 반드시 캐릭터 성격에 맞게 대답해.
2. 한국어로만 대답해.
3. 3문장 이내로 짧게 대답해.
4. 탐험/동네/장소와 관련 없는 질문은 자연스럽게 탐험 주제로 돌려.
5. 사용자의 레벨과 최근 활동을 참고해서 맞춤 답변을 해.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json({ error: "인증 실패" }, 401);

    const { message, area } = await req.json();
    if (!message || typeof message !== "string") {
      return json({ error: "메시지가 필요합니다." }, 400);
    }

    // ── 1. 프리미엄 확인 ─────────────────────────────────────────────
    let isPremium = false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && typeof profile.is_premium === "boolean") {
      isPremium = profile.is_premium;
    }

    const dailyLimit = isPremium ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE;

    // ── 2. 캐릭터 정보 ──────────────────────────────────────────────
    const { data: character, error: charErr } = await supabase
      .from("characters")
      .select("name, character_type, level, xp")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (charErr) {
      console.error("character-chat character query:", charErr);
      return json({ error: "캐릭터 정보를 불러오지 못했습니다." }, 500);
    }
    if (!character) {
      return json({ error: "캐릭터를 먼저 생성해주세요." }, 400);
    }

    // ── 3. 오늘 채팅 횟수 ────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("character_chats")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    const usedToday = todayCount ?? 0;

    if (usedToday >= dailyLimit) {
      return json({
        error: isPremium
          ? "오늘 채팅 횟수를 모두 사용했어요. (20회/일)"
          : "무료 채팅 횟수를 모두 사용했어요. 프리미엄으로 업그레이드하면 하루 20회까지 가능해요!",
        remaining_chats_today: 0,
      }, 429);
    }

    // ── 4. 최근 이벤트 완료 내역 (컨텍스트용) ────────────────────────
    const { data: recentCompletions } = await supabase
      .from("event_completions")
      .select("event_id")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(5);

    const recentPlaces: string[] = [];
    if (recentCompletions && recentCompletions.length > 0) {
      const eventIds = recentCompletions.map(
        (c: { event_id: string }) => c.event_id,
      );
      const { data: events } = await supabase
        .from("events")
        .select("title")
        .in("id", eventIds);

      if (events) {
        recentPlaces.push(
          ...events.map((e: { title: string }) => e.title),
        );
      }
    }

    // ── 5. Claude API 호출 ───────────────────────────────────────────
    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
    if (!claudeKey) {
      return json({ error: "AI 서비스가 설정되지 않았습니다. (ANTHROPIC_API_KEY)" }, 500);
    }

    const systemPrompt = buildSystemPrompt(
      character.character_type,
      character.name,
      character.level,
      recentPlaces,
      area ?? "",
    );

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, err);
      let hint = "AI 응답 생성에 실패했습니다.";
      if (claudeRes.status === 401) hint = "Anthropic API 키가 잘못되었습니다.";
      else if (claudeRes.status === 402 || err.includes("credit")) {
        hint = "Anthropic 크레딧이 부족합니다. 콘솔에서 충전해 주세요.";
      } else if (claudeRes.status === 404 || err.includes("model")) {
        hint = "모델 이름을 확인하세요. (claude-sonnet-4-20250514)";
      }
      return json({ error: hint, detail: err.slice(0, 300) }, 502);
    }

    const claudeData = await claudeRes.json();
    const reply: string = claudeData?.content?.[0]?.text ?? "";

    if (!reply) {
      return json({ error: "AI 응답이 비어있습니다." }, 502);
    }

    // ── 6. 채팅 기록 저장 ────────────────────────────────────────────
    await supabase.from("character_chats").insert({
      user_id: user.id,
      character_type: character.character_type,
      user_message: message,
      ai_reply: reply,
    });

    const remaining = dailyLimit - usedToday - 1;

    return json({
      reply,
      remaining_chats_today: remaining,
    });
  } catch (err) {
    console.error("character-chat error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
