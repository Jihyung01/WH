/**
 * generate-exploration-note (Phase 7)
 *
 * 유저의 최근 탐험 행동을 한 줄 만화 톤으로 요약한다.
 * 프로필의 "AI 탐험 노트 🤖" 카드에 표시된다.
 *
 * 호출:  POST /functions/v1/generate-exploration-note
 * 응답:  { interest: string, recent_category: string, line: string }
 *
 * 입력:  Authorization: Bearer <jwt>
 *
 * 캐시:  최근 7일 이내 같은 유저의 노트가 있으면 재사용한다.
 *        (탐험 행동이 거의 없을 때 매번 Claude 호출하는 비용 절감)
 */
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
  cafe: "카페",
  culture: "문화·예술",
  food: "맛집",
  nature: "자연·산책",
  nightlife: "야간 산책",
  shopping: "쇼핑",
  hidden_gem: "숨은 명소",
  photo: "포토 스팟",
  quiz: "퀴즈",
  partnership: "파트너 이벤트",
};

interface ActivitySummary {
  total_checkins: number;
  recent_district: string | null;
  top_category: string | null;
  recent_categories: string[];
  active_hours: number[]; // 0~23 시간대 분포 상위
  streak_days: number;
}

async function fetchActivity(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<ActivitySummary> {
  // 최근 30일 체크인 + 카테고리 + 시간대
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: checkins } = await supabaseAdmin
    .from("checkins")
    .select("created_at, event_id")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(80);

  const eventIds = (checkins ?? [])
    .map((c: { event_id: string | null }) => c.event_id)
    .filter((id: string | null): id is string => Boolean(id));

  let topCategory: string | null = null;
  let recentCategories: string[] = [];
  let recentDistrict: string | null = null;

  if (eventIds.length > 0) {
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("category, district")
      .in("id", eventIds);

    const counts: Record<string, number> = {};
    for (const e of events ?? []) {
      const cat = (e as { category?: string | null }).category;
      if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    topCategory = sorted[0]?.[0] ?? null;
    recentCategories = sorted.slice(0, 3).map(([k]) => k);

    const districtCounts: Record<string, number> = {};
    for (const e of events ?? []) {
      const d = (e as { district?: string | null }).district;
      if (d) districtCounts[d] = (districtCounts[d] ?? 0) + 1;
    }
    const districtSorted = Object.entries(districtCounts).sort(
      (a, b) => b[1] - a[1],
    );
    recentDistrict = districtSorted[0]?.[0] ?? null;
  }

  // 시간대 분포
  const hourCounts: Record<number, number> = {};
  for (const c of checkins ?? []) {
    const h = new Date(
      (c as { created_at: string }).created_at,
    ).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const activeHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => Number(h));

  // streak — 연속 체크인 일자 (오늘 기준 거꾸로)
  const days = new Set<string>();
  for (const c of checkins ?? []) {
    days.add(
      new Date((c as { created_at: string }).created_at)
        .toISOString()
        .slice(0, 10),
    );
  }
  let streakDays = 0;
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    if (days.has(d)) streakDays += 1;
    else if (i > 0) break;
  }

  return {
    total_checkins: checkins?.length ?? 0,
    recent_district: recentDistrict,
    top_category: topCategory,
    recent_categories: recentCategories,
    active_hours: activeHours,
    streak_days: streakDays,
  };
}

function buildPrompt(activity: ActivitySummary): string {
  const lines: string[] = [
    "You are a witty manga-style narrator for the WhereHere app, a Korean location-based exploration game.",
    "Read the user's recent 30-day activity and write a one-line observation about their identity as an explorer.",
    "Output language: Korean. Tone: warm, slightly playful, like a friend describing them.",
    "Length: 2 short Korean sentences total. NEVER mention specific data labels (no '카테고리', '체크인'). Keep it human.",
    "",
    "Activity:",
    `- 최근 30일 체크인 횟수: ${activity.total_checkins}`,
    `- 자주 다닌 동네: ${activity.recent_district ?? "다양한 곳"}`,
    `- 가장 즐긴 분위기: ${
      activity.top_category
        ? CATEGORY_KO[activity.top_category] ?? activity.top_category
        : "특정 패턴 없음"
    }`,
    `- 최근 자주 찾은 분위기 3개: ${
      activity.recent_categories
        .map((c) => CATEGORY_KO[c] ?? c)
        .join(", ") || "다양함"
    }`,
    `- 주로 활동한 시간대(시): ${
      activity.active_hours.length > 0
        ? activity.active_hours.map((h) => `${h}시`).join(", ")
        : "다양함"
    }`,
    `- 최근 연속 체크인 일수: ${activity.streak_days}일`,
    "",
    "Return JSON only, exact shape:",
    `{"interest":"<짧은 명사구, 12자 이내>","recent_category":"<짧은 명사구, 12자 이내>","line":"<2문장 합쳐 80자 이내>"}`,
  ];
  return lines.join("\n");
}

async function callClaude(
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 280,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    console.error("Claude error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const j = await res.json();
  const text = j?.content?.[0]?.text;
  return typeof text === "string" ? text : null;
}

interface NoteShape {
  interest: string;
  recent_category: string;
  line: string;
}

function parseNote(raw: string): NoteShape | null {
  try {
    // 코드블록 제거
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const obj = JSON.parse(cleaned);
    if (
      typeof obj?.interest === "string" &&
      typeof obj?.recent_category === "string" &&
      typeof obj?.line === "string"
    ) {
      return {
        interest: obj.interest.slice(0, 24),
        recent_category: obj.recent_category.slice(0, 24),
        line: obj.line.slice(0, 160),
      };
    }
  } catch (e) {
    console.warn("note parse fail", e);
  }
  return null;
}

function fallbackNote(activity: ActivitySummary): NoteShape {
  const categoryKo = activity.top_category
    ? CATEGORY_KO[activity.top_category] ?? activity.top_category
    : "도시 산책";
  const districtKo = activity.recent_district ?? "익숙한 동네";
  return {
    interest: `${districtKo}의 ${categoryKo}`,
    recent_category: categoryKo,
    line: `당신은 ${districtKo}의 ${categoryKo}을 좋아해요. 최근에도 ${categoryKo} 위주로 다녔어요.`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return json({ error: "Missing auth" }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
    token,
  );
  if (userErr || !userData?.user) {
    return json({ error: "Invalid token" }, 401);
  }
  const userId = userData.user.id;

  // 1) 최근 7일 캐시 확인
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabaseAdmin
    .from("ai_exploration_notes")
    .select("interest, recent_category, line, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached) {
    return json({
      interest: cached.interest,
      recent_category: cached.recent_category,
      line: cached.line,
      cached: true,
    });
  }

  // 2) 활동 요약
  const activity = await fetchActivity(supabaseAdmin, userId);

  // 3) Claude 호출 (키 없으면 fallback)
  let note: NoteShape | null = null;
  if (anthropicKey) {
    const raw = await callClaude(anthropicKey, buildPrompt(activity));
    if (raw) note = parseNote(raw);
  }
  if (!note) note = fallbackNote(activity);

  // 4) 캐시 저장 (best effort)
  await supabaseAdmin.from("ai_exploration_notes").insert({
    user_id: userId,
    interest: note.interest,
    recent_category: note.recent_category,
    line: note.line,
  });

  return json({ ...note, cached: false });
});
