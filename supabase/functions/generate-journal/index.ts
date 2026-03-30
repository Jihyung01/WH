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

// ── Character Personality ────────────────────────────────────────────────────

const CHARACTER_TONE: Record<string, { name: string; tone: string }> = {
  dodam: {
    name: "도담",
    tone: "따뜻하고 편안한 말투, 반말 섞인 친근한 톤",
  },
  narae: {
    name: "나래",
    tone: "에너지 넘치고 활발한 말투, 감탄사 많이 사용",
  },
  haram: {
    name: "하람",
    tone: "지혜롭고 차분한 말투, 깊이 있는 관찰",
  },
  byeolzzi: {
    name: "별찌",
    tone: "귀엽고 장난스러운 말투, 이모티콘 느낌의 표현",
  },
};

// ── Claude API ───────────────────────────────────────────────────────────────

function buildJournalPrompt(
  characterName: string,
  characterType: string,
  level: number,
  places: string[],
  xpEarned: number,
): string {
  const personality = CHARACTER_TONE[characterType] ?? CHARACTER_TONE.dodam;

  return `당신은 WhereHere 앱의 탐험 캐릭터 "${characterName}" (${personality.name})입니다.
오늘 하루의 탐험 일지를 작성하세요.

## 캐릭터 정보
- 이름: ${characterName}
- 성격: ${personality.tone}
- 레벨: ${level}

## 오늘 방문한 장소
${places.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 획득 정보
- 경험치: ${xpEarned}XP

## 규칙
1. 한국어로 3~4문장 작성
2. ${personality.tone}
3. 방문한 장소를 구체적으로 언급
4. 마지막 문장은 내일의 탐험에 대한 기대감/떡밥
5. 순수 텍스트만 출력 (JSON이나 마크다운 없이)`;
}

function buildNoEventPrompt(
  characterName: string,
  characterType: string,
  level: number,
): string {
  const personality = CHARACTER_TONE[characterType] ?? CHARACTER_TONE.dodam;

  return `당신은 WhereHere 앱의 탐험 캐릭터 "${characterName}" (${personality.name})입니다.
오늘은 탐험을 하지 않은 날의 일지를 작성하세요.

## 캐릭터 정보
- 이름: ${characterName}
- 성격: ${personality.tone}
- 레벨: ${level}

## 규칙
1. 한국어로 3~4문장 작성
2. ${personality.tone}
3. 오늘 쉬어가는 것도 괜찮다는 따뜻한 응원
4. 마지막 문장은 내일 탐험을 떠나고 싶게 만드는 동기 부여
5. 순수 텍스트만 출력 (JSON이나 마크다운 없이)`;
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
      max_tokens: 500,
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

// ── Handler ──────────────────────────────────────────────────────────────────

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

    // ── 1. 날짜 파싱 ─────────────────────────────────────────────────
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date ?? new Date().toISOString().slice(0, 10);
    } catch {
      targetDate = new Date().toISOString().slice(0, 10);
    }

    // ── 2. 캐시 확인 ─────────────────────────────────────────────────
    const { data: existingJournal } = await supabase
      .from("journals")
      .select("journal_text, share_card")
      .eq("user_id", user.id)
      .eq("journal_date", targetDate)
      .maybeSingle();

    if (existingJournal) {
      return json({
        journal_text: existingJournal.journal_text,
        share_card: existingJournal.share_card,
        cached: true,
      });
    }

    // ── 3. 캐릭터 정보 조회 ──────────────────────────────────────────
    const { data: character } = await supabase
      .from("characters")
      .select("name, character_type, level, xp")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const charName = character?.name ?? "탐험가";
    const charType = character?.character_type ?? "dodam";
    const charLevel = character?.level ?? 1;

    // ── 4. 완료 이벤트 조회 ──────────────────────────────────────────
    const dayStart = `${targetDate}T00:00:00`;
    const dayEnd = `${targetDate}T23:59:59`;

    const { data: completions } = await supabase
      .from("event_completions")
      .select("xp_earned, event_id, events(title, address, district, category)")
      .eq("user_id", user.id)
      .gte("completed_at", dayStart)
      .lte("completed_at", dayEnd);

    const events = completions ?? [];
    const placesVisited = events.map(
      (c: { events: { title: string } }) => c.events?.title,
    ).filter(Boolean) as string[];
    const xpEarned = events.reduce(
      (sum: number, c: { xp_earned: number }) => sum + (c.xp_earned ?? 0),
      0,
    );

    // ── 5. 배지 확인 ─────────────────────────────────────────────────
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("badges(name)")
      .eq("user_id", user.id)
      .gte("earned_at", dayStart)
      .lte("earned_at", dayEnd);

    const badgesEarned = (badgesData ?? [])
      .map((b: { badges: { name: string } }) => b.badges?.name)
      .filter(Boolean) as string[];

    // ── 6. Claude API 호출 ───────────────────────────────────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return json({ error: "일지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
    }

    const hasEvents = placesVisited.length > 0;
    const prompt = hasEvents
      ? buildJournalPrompt(charName, charType, charLevel, placesVisited, xpEarned)
      : buildNoEventPrompt(charName, charType, charLevel);

    const journalText = await callClaude(apiKey, prompt);

    if (!journalText) {
      return json({ error: "일지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." }, 500);
    }

    // ── 7. share_card 조립 ───────────────────────────────────────────
    const shareCard = {
      character_name: charName,
      places_visited: placesVisited,
      xp_earned: xpEarned,
      badges_earned: badgesEarned,
    };

    const eventsCompleted = events.map(
      (c: { event_id: string; xp_earned: number; events: { title: string; category: string } }) => ({
        event_id: c.event_id,
        title: c.events?.title,
        category: c.events?.category,
        xp_earned: c.xp_earned,
      }),
    );

    // ── 8. DB 저장 ───────────────────────────────────────────────────
    await supabase.from("journals").insert({
      user_id: user.id,
      journal_date: targetDate,
      journal_text: journalText,
      share_card: shareCard,
      events_completed: eventsCompleted,
    });

    // ── 9. 응답 ──────────────────────────────────────────────────────
    return json({
      journal_text: journalText,
      share_card: shareCard,
      cached: false,
    });
  } catch (err) {
    console.error("generate-journal error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
