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

interface GenerateRequest {
  location_name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
}

interface SaveRequest {
  action: "save";
  event_data: {
    title: string;
    narrative: string;
    description: string;
    lat: number;
    lng: number;
    address: string;
    district: string;
    category: string;
    difficulty: number;
    reward_xp: number;
    missions: GeneratedMission[];
    /** Public URL in `mission-photos` bucket (`ugc-covers/...`), optional */
    cover_image_url?: string | null;
  };
}

interface GeneratedMission {
  step_order: number;
  mission_type: string;
  title: string;
  description: string;
  config?: Record<string, unknown>;
}

interface SuggestedEvent {
  title: string;
  narrative: string;
  missions: GeneratedMission[];
  difficulty: number;
  reward_xp: number;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildUGCPrompt(
  locationName: string,
  address: string,
  category: string,
  description?: string,
): string {
  const categoryMap: Record<string, string> = {
    exploration: "탐험",
    photo: "사진",
    quiz: "퀴즈",
    etc: "기타",
  };
  const categoryLabel = categoryMap[category] ?? category;
  const descriptionContext = description
    ? `\n사용자 설명: "${description}"`
    : "";

  return `당신은 WhereHere 앱의 수석 콘텐츠 디자이너입니다.
사용자가 제안한 장소를 기반으로 탐험 이벤트 1개를 생성하세요.

## 장소 정보
- 장소명: ${locationName}
- 주소: ${address}
- 카테고리: ${categoryLabel}${descriptionContext}

## 규칙
1. 제목은 15자 이내, 장소와 관련된 흥미로운 제목
2. 서사(narrative)는 한국어 2~3문장, 모험 시작의 느낌으로 신비롭고 매력적인 톤
3. 미션은 2~3개:
   - 첫 번째: 반드시 "gps_checkin" (100m 반경 GPS 검증)
   - 두 번째: 카테고리에 맞는 미션 (photo/quiz/text 중 택1)
   - 세 번째: 난이도 4 이상이면 추가 미션
4. 난이도는 1~5 사이
5. 보상 XP = 난이도 × 50 + 50
6. quiz 미션의 config: question, options(4개), correct_index, explanation
7. photo 미션의 config: prompt(촬영 지시문)
8. text 미션의 config: prompt(작성 지시문), min_length

## 출력 형식
JSON 객체만 출력하세요. 다른 텍스트 없이 순수 JSON만.

{
  "title": "제목",
  "narrative": "서사 2~3문장",
  "missions": [
    {
      "step_order": 1,
      "mission_type": "gps_checkin",
      "title": "장소 도착 인증",
      "description": "해당 장소에 도착하여 GPS 체크인을 완료하세요.",
      "config": { "radius_m": 100 }
    },
    {
      "step_order": 2,
      "mission_type": "photo",
      "title": "미션 제목",
      "description": "미션 설명",
      "config": { "prompt": "촬영 지시문" }
    }
  ],
  "difficulty": 2,
  "reward_xp": 150
}`;
}

// ── Claude API ───────────────────────────────────────────────────────────────

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const braces = raw.match(/\{[\s\S]*\}/);
  if (braces) return braces[0];

  return raw.trim();
}

function validateSuggested(obj: Record<string, unknown>): SuggestedEvent {
  if (!obj.title || typeof obj.title !== "string") {
    throw new Error("title is missing or invalid");
  }
  if (!obj.narrative || typeof obj.narrative !== "string") {
    throw new Error("narrative is missing or invalid");
  }
  if (!obj.missions || !Array.isArray(obj.missions) || obj.missions.length < 2) {
    throw new Error("missions must be an array with at least 2 items");
  }

  const diff = Number(obj.difficulty);
  const difficulty = diff >= 1 && diff <= 5 ? diff : 2;
  const reward_xp = Number(obj.reward_xp) || difficulty * 50 + 50;

  return {
    title: obj.title as string,
    narrative: obj.narrative as string,
    missions: obj.missions as GeneratedMission[],
    difficulty,
    reward_xp,
  };
}

async function generateWithClaude(
  apiKey: string,
  prompt: string,
): Promise<SuggestedEvent> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
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

  const jsonStr = extractJsonObject(rawText);
  const parsed = JSON.parse(jsonStr);

  return validateSuggested(parsed as Record<string, unknown>);
}

// ── Save handler ─────────────────────────────────────────────────────────────

async function handleSave(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventData: SaveRequest["event_data"],
): Promise<Response> {
  const rawCover =
    typeof eventData.cover_image_url === "string"
      ? eventData.cover_image_url.trim()
      : "";
  const coverImageUrl = rawCover.length >= 8 ? rawCover : null;

  const { data: inserted, error: insertErr } = await supabase
    .from("events")
    .insert({
      title: eventData.title,
      description: eventData.description,
      narrative: eventData.narrative,
      location: `SRID=4326;POINT(${eventData.lng} ${eventData.lat})`,
      address: eventData.address,
      district: eventData.district,
      category: eventData.category,
      difficulty: eventData.difficulty,
      reward_xp: eventData.reward_xp,
      creator_type: "user",
      creator_id: userId,
      status: "approved",
      is_active: true,
      is_seasonal: false,
      cover_image_url: coverImageUrl,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Failed to insert UGC event:", insertErr.message);
    return json({ error: "이벤트 저장에 실패했습니다." }, 500);
  }

  const eventId = inserted.id;

  const missionRows = eventData.missions.map((m) => ({
    event_id: eventId,
    step_order: m.step_order,
    mission_type: m.mission_type,
    title: m.title,
    description: m.description ?? "",
    config: m.config ?? {},
    required: true,
  }));

  const { error: missionErr } = await supabase
    .from("missions")
    .insert(missionRows);

  if (missionErr) {
    console.error("Failed to insert UGC missions:", missionErr.message);
    await supabase.from("events").delete().eq("id", eventId);
    return json({ error: "미션 저장에 실패했습니다." }, 500);
  }

  let feedSubmissionId: string | null = null;

  if (coverImageUrl) {
    const { data: feedRow, error: feedErr } = await supabase
      .from("community_submissions")
      .insert({
        user_id: userId,
        submission_type: "ugc_event_cover",
        mission_completion_id: null,
        mission_id: null,
        event_id: eventId,
        image_url: coverImageUrl,
        visibility: "public",
      })
      .select("id")
      .single();
    if (feedErr) {
      console.error("Failed to insert UGC cover feed row:", feedErr.message);
      await supabase.from("missions").delete().eq("event_id", eventId);
      await supabase.from("events").delete().eq("id", eventId);
      return json({ error: "커버 이미지 피드 등록에 실패했습니다." }, 500);
    }
    feedSubmissionId = feedRow?.id ?? null;
  }

  console.log(`[generate-ugc-event] Saved UGC event ${eventId} by user ${userId}`);

  return json({ event_id: eventId, feed_submission_id: feedSubmissionId });
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

    // Ensure a character row exists (review / edge accounts may skip onboarding UI)
    const { data: existingChar, error: charErr } = await supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (charErr) {
      console.error("characters lookup:", charErr.message);
      return json({ error: "캐릭터 정보를 불러오지 못했습니다." }, 500);
    }

    if (!existingChar) {
      const { error: insErr } = await supabase.from("characters").insert({
        user_id: user.id,
        name: "도담",
        character_type: "explorer",
      });
      if (insErr) {
        console.error("UGC default character insert:", insErr.message);
        return json(
          { error: "캐릭터를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." },
          500,
        );
      }
    }

    const body = await req.json();

    // ── Save action ──
    if (body.action === "save") {
      const saveBody = body as SaveRequest;
      if (!saveBody.event_data) {
        return json({ error: "event_data가 필요합니다." }, 400);
      }
      return handleSave(supabase, user.id, saveBody.event_data);
    }

    // ── Generate action ──
    const {
      location_name,
      address,
      lat,
      lng,
      category,
      description,
    } = body as GenerateRequest;

    if (!location_name || !address || lat == null || lng == null || !category) {
      return json(
        { error: "location_name, address, lat, lng, category는 필수입니다." },
        400,
      );
    }

    // Check daily creation limit
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount, error: countErr } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .eq("creator_type", "user")
      .gte("created_at", `${today}T00:00:00Z`);

    if (countErr) {
      console.error("Failed to count today's events:", countErr.message);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle();

    const dailyLimit = profile?.is_premium ? 10 : 3;

    if ((todayCount ?? 0) >= dailyLimit) {
      return json(
        { error: `오늘의 이벤트 생성 한도(${dailyLimit}회)를 초과했습니다.` },
        429,
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "AI 서비스가 설정되지 않았습니다." }, 500);
    }

    const prompt = buildUGCPrompt(location_name, address, category, description);

    console.log(
      `[generate-ugc-event] Generating event for "${location_name}" by user ${user.id}`,
    );

    const suggested = await generateWithClaude(apiKey, prompt);

    console.log(
      `[generate-ugc-event] Generated: "${suggested.title}" (difficulty: ${suggested.difficulty})`,
    );

    return json({ suggested_event: suggested });
  } catch (err) {
    console.error("generate-ugc-event error:", err);

    if (err instanceof SyntaxError) {
      return json(
        { error: "AI 응답을 파싱하지 못했습니다. 다시 시도해주세요." },
        500,
      );
    }

    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return json({ error: message }, 500);
  }
});
