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

// ── Types ────────────────────────────────────────────────────────────────────

interface GeneratedEvent {
  title: string;
  description: string;
  narrative: string;
  lat: number;
  lng: number;
  address: string;
  place_name: string;
  category: "exploration" | "photo" | "quiz" | "partnership";
  difficulty: number;
  reward_xp: number;
  missions: GeneratedMission[];
}

interface GeneratedMission {
  step_order: number;
  mission_type: "gps_checkin" | "photo" | "quiz" | "text" | "timer";
  title: string;
  description: string;
  config: Record<string, unknown>;
  required: boolean;
}

interface RequestBody {
  district: string;
  count?: number;
  categories?: string[];
  difficulty_range?: [number, number];
  partner_name?: string;
  creator_type?: string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildBatchPrompt(
  district: string,
  count: number,
  categories: string[],
  diffRange: [number, number],
  partnerName?: string,
): string {
  const categoryList = categories.length > 0
    ? categories.join(", ")
    : "exploration, photo, quiz, partnership";

  const partnerContext = partnerName
    ? `\n이 이벤트들은 "${partnerName}" 제휴 업장 연계 이벤트입니다. 해당 브랜드/장소와 관련된 콘텐츠를 만드세요.`
    : "";

  return `당신은 WhereHere 앱의 수석 콘텐츠 디자이너입니다.
서울 ${district} 지역의 **실제 존재하는 명소** ${count}곳을 탐험 이벤트로 생성하세요.${partnerContext}

## 규칙
1. 모든 장소는 서울 ${district}에 실제 존재하는 상호/랜드마크여야 합니다
2. GPS 좌표(lat, lng)는 해당 장소의 실제 위치여야 합니다
3. 서사(narrative)는 모험 시작의 느낌으로, 한국어 3문장, 신비롭고 매력적인 톤
4. 카테고리는 [${categoryList}] 중에서 골고루 분배
5. 난이도는 ${diffRange[0]}~${diffRange[1]} 사이
6. 보상 XP는 난이도 × 50 + 50 (기본)
7. 각 이벤트에 미션 2~3개:
   - 첫 번째 미션: 반드시 "gps_checkin" (100m 반경 GPS 검증)
   - 두 번째 미션: "photo" 또는 "quiz" 또는 "text" 중 하나
   - partnership 카테고리이거나 난이도 4 이상이면 세 번째 미션 추가
8. quiz 미션의 config에는 question, options(4개), correct_index, explanation 포함
9. photo 미션의 config에는 prompt(촬영 지시문) 포함
10. text 미션의 config에는 prompt(작성 지시문), min_length 포함

## 출력 형식
JSON 배열만 출력하세요. 다른 텍스트 없이 순수 JSON만.

[
  {
    "title": "제목 (15자 이내)",
    "description": "한 줄 설명 (30자 이내)",
    "narrative": "몰입감 있는 서사 3문장",
    "lat": 37.xxxxx,
    "lng": 126.xxxxx,
    "address": "서울시 ${district} 실제 주소",
    "place_name": "실제 상호명 또는 랜드마크명",
    "category": "exploration",
    "difficulty": 2,
    "reward_xp": 150,
    "missions": [
      {
        "step_order": 1,
        "mission_type": "gps_checkin",
        "title": "장소 도착 인증",
        "description": "해당 장소에 도착하여 GPS 체크인을 완료하세요.",
        "config": { "radius_m": 100 },
        "required": true
      },
      {
        "step_order": 2,
        "mission_type": "quiz",
        "title": "퀴즈 제목",
        "description": "퀴즈 설명",
        "config": {
          "question": "질문",
          "options": ["보기1", "보기2", "보기3", "보기4"],
          "correct_index": 0,
          "explanation": "해설"
        },
        "required": true
      }
    ]
  }
]`;
}

// ── Claude API ───────────────────────────────────────────────────────────────

function extractJsonArray(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const brackets = raw.match(/\[[\s\S]*\]/);
  if (brackets) return brackets[0];

  return raw.trim();
}

function validateEvent(e: unknown, index: number): GeneratedEvent | null {
  const obj = e as Record<string, unknown>;
  if (!obj.title || typeof obj.title !== "string") return null;
  if (typeof obj.lat !== "number" || typeof obj.lng !== "number") return null;
  if (!obj.missions || !Array.isArray(obj.missions) || obj.missions.length < 2) return null;

  const validCategories = ["exploration", "photo", "quiz", "partnership"];
  if (!validCategories.includes(obj.category as string)) {
    obj.category = "exploration";
  }

  const diff = Number(obj.difficulty);
  obj.difficulty = diff >= 1 && diff <= 5 ? diff : 2;
  obj.reward_xp = Number(obj.reward_xp) || (diff * 50 + 50);

  if (obj.lat < 33 || obj.lat > 39 || obj.lng < 124 || obj.lng > 132) {
    console.warn(`Event ${index} has coordinates outside Korea, skipping`);
    return null;
  }

  return obj as unknown as GeneratedEvent;
}

async function generateWithClaude(
  apiKey: string,
  prompt: string,
): Promise<GeneratedEvent[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Claude API error:", res.status, err);
    throw new Error(`Claude API failed: ${res.status}`);
  }

  const data = await res.json();
  const rawText: string = data?.content?.[0]?.text ?? "";

  const jsonStr = extractJsonArray(rawText);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Claude did not return a JSON array");
  }

  const validated: GeneratedEvent[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const v = validateEvent(parsed[i], i);
    if (v) validated.push(v);
  }

  if (validated.length === 0) {
    throw new Error("No valid events generated");
  }

  return validated;
}

// ── DB Insert ────────────────────────────────────────────────────────────────

async function bulkInsertEvents(
  supabase: ReturnType<typeof createClient>,
  events: GeneratedEvent[],
  district: string,
  creatorType: string,
  partnerName?: string,
): Promise<{ inserted: number; event_ids: string[] }> {
  const eventIds: string[] = [];
  let insertedCount = 0;

  for (const evt of events) {
    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert({
        title: evt.title,
        description: evt.description,
        narrative: evt.narrative,
        location: `SRID=4326;POINT(${evt.lng} ${evt.lat})`,
        address: evt.address,
        district,
        category: evt.category,
        difficulty: evt.difficulty,
        reward_xp: evt.reward_xp,
        creator_type: creatorType,
        partner_name: partnerName ?? null,
        is_active: true,
        is_seasonal: false,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error(`Failed to insert event "${evt.title}":`, insertErr.message);
      continue;
    }

    const eventId = inserted.id;
    eventIds.push(eventId);

    const missionRows = evt.missions.map((m) => ({
      event_id: eventId,
      step_order: m.step_order,
      mission_type: m.mission_type,
      title: m.title,
      description: m.description ?? "",
      config: m.config ?? {},
      required: m.required ?? true,
    }));

    const { error: missionErr } = await supabase
      .from("missions")
      .insert(missionRows);

    if (missionErr) {
      console.error(`Failed to insert missions for "${evt.title}":`, missionErr.message);
      await supabase.from("events").delete().eq("id", eventId);
      eventIds.pop();
      continue;
    }

    insertedCount++;
  }

  return { inserted: insertedCount, event_ids: eventIds };
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

    const body: RequestBody = await req.json();

    if (!body.district || typeof body.district !== "string") {
      return json({ error: "district(지역명)가 필요합니다." }, 400);
    }

    const count = Math.min(Math.max(body.count ?? 5, 1), 15);
    const categories = body.categories ?? [];
    const diffRange: [number, number] = body.difficulty_range ?? [1, 5];
    const creatorType = body.creator_type ?? "ai_generated";
    const partnerName = body.partner_name;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "AI 서비스가 설정되지 않았습니다." }, 500);
    }

    const prompt = buildBatchPrompt(
      body.district,
      count,
      categories,
      diffRange,
      partnerName,
    );

    console.log(`[generate-events-batch] Generating ${count} events for ${body.district}`);

    const generatedEvents = await generateWithClaude(apiKey, prompt);

    console.log(`[generate-events-batch] Claude returned ${generatedEvents.length} valid events`);

    const result = await bulkInsertEvents(
      supabase,
      generatedEvents,
      body.district,
      creatorType,
      partnerName,
    );

    console.log(`[generate-events-batch] Inserted ${result.inserted}/${generatedEvents.length} events`);

    return json({
      success: true,
      district: body.district,
      requested: count,
      generated: generatedEvents.length,
      inserted: result.inserted,
      event_ids: result.event_ids,
    });
  } catch (err) {
    console.error("generate-events-batch error:", err);

    if (err instanceof SyntaxError) {
      return json({ error: "AI 응답을 파싱하지 못했습니다. 다시 시도해주세요." }, 500);
    }

    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return json({ error: message }, 500);
  }
});
