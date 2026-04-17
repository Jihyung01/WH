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

const MBTI_STYLE: Record<string, string> = {
  ISTJ: "사실 중심, 차분하고 신뢰감 있는 어조",
  ISFJ: "배려 깊고 안정적인 어조",
  INFJ: "통찰과 의미를 강조하는 어조",
  INTJ: "전략적이고 구조적인 어조",
  ISTP: "간결하고 현실적인 관찰 어조",
  ISFP: "감각적이고 따뜻한 어조",
  INFP: "감정과 가치 중심의 서정적 어조",
  INTP: "호기심과 분석을 담은 어조",
  ESTP: "즉흥적이고 생동감 있는 어조",
  ESFP: "밝고 에너지 넘치는 어조",
  ENFP: "영감과 가능성을 강조하는 어조",
  ENTP: "재치 있고 실험적인 어조",
  ESTJ: "명료하고 실행 중심의 어조",
  ESFJ: "관계 중심, 친근한 어조",
  ENFJ: "격려와 공감을 주는 리더형 어조",
  ENTJ: "목표 지향적이고 자신감 있는 어조",
};

function buildMBTIPromptAddendum(mbti: string | null): string {
  if (!mbti) return "";
  const key = mbti.toUpperCase();
  const style = MBTI_STYLE[key];
  if (!style) return "";
  return `\n\n## MBTI 개인화\n- 사용자 MBTI: ${key}\n- 서술 편향: ${style}`;
}

type EventCompletionRow = {
  xp_earned: number | null;
  event_id: string | null;
  events: {
    title: string | null;
    address: string | null;
    district: string | null;
    category: string | null;
  } | null;
};

type MarkRow = {
  id: string;
  content: string;
  district: string | null;
  created_at: string;
  music_json: Record<string, unknown> | null;
  photo_url: string | null;
  emoji_icon: string | null;
  xp_granted: number | null;
};

type FeedRow = {
  id: string;
  submission_type: "mission_photo" | "ugc_event_cover";
  image_url: string | null;
  created_at: string;
  event_id: string | null;
  events: {
    title: string | null;
    district: string | null;
  } | null;
};

type TimelineItem = {
  time: string;
  emoji: string;
  summary: string;
  photo_url: string | null;
  has_music: boolean;
  music_title: string | null;
  mark_id: string | null;
};

// ── Claude API ───────────────────────────────────────────────────────────────

function buildJournalPrompt(
  characterName: string,
  characterType: string,
  level: number,
  places: string[],
  marks: MarkRow[],
  feedRows: FeedRow[],
  xpEarned: number,
  mbti: string | null,
): string {
  const personality = CHARACTER_TONE[characterType] ?? CHARACTER_TONE.dodam;
  const markLines = marks
    .slice(0, 6)
    .map((m, i) => `${i + 1}. ${m.content}${m.district ? ` (${m.district})` : ""}`);
  const feedLines = feedRows
    .slice(0, 5)
    .map((f, i) => {
      const title = f.events?.title ?? "피드 기록";
      const typeLabel = f.submission_type === "ugc_event_cover" ? "이벤트 커버" : "미션 인증";
      return `${i + 1}. ${title} · ${typeLabel}`;
    });

  const base = `당신은 WhereHere 앱의 탐험 캐릭터 "${characterName}" (${personality.name})입니다.
오늘 하루의 탐험 일지를 작성하세요.

## 캐릭터 정보
- 이름: ${characterName}
- 성격: ${personality.tone}
- 레벨: ${level}

## 오늘 방문한 장소
${places.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 오늘 남긴 흔적
${markLines.length > 0 ? markLines.join("\n") : "- 없음"}

## 오늘 피드 기록
${feedLines.length > 0 ? feedLines.join("\n") : "- 없음"}

## 획득 정보
- 경험치: ${xpEarned}XP

## 규칙
1. 한국어로 3~4문장 작성
2. ${personality.tone}
3. 방문한 장소/흔적/피드 중 실제 데이터가 있는 항목만 구체적으로 언급
4. 마지막 문장은 내일의 탐험에 대한 기대감/떡밥
5. 순수 텍스트만 출력 (JSON이나 마크다운 없이)`;

  // MBTI 수정자는 기본 규칙을 덮지 않고 뒤에 "얹는 편향"으로 붙인다.
  return base + buildMBTIPromptAddendum(mbti);
}

function buildNoEventPrompt(
  characterName: string,
  characterType: string,
  level: number,
  mbti: string | null,
): string {
  const personality = CHARACTER_TONE[characterType] ?? CHARACTER_TONE.dodam;

  const base = `당신은 WhereHere 앱의 탐험 캐릭터 "${characterName}" (${personality.name})입니다.
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

  return base + buildMBTIPromptAddendum(mbti);
}

function toHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => (typeof v === "string" ? v.trim() : "")).filter((v) => v.length > 0)),
  );
}

function buildTimelineData(
  marks: MarkRow[],
  feedRows: FeedRow[],
  events: EventCompletionRow[],
  charName: string,
): {
  intro: string;
  timeline: TimelineItem[];
  outro: string;
  total_marks: number;
  total_checkins: number;
  districts_visited: string[];
} {
  const timelineFromMarks: TimelineItem[] = marks.map((m) => {
    const musicTitle =
      typeof m.music_json?.title === "string" ? (m.music_json.title as string) : null;
    return {
      time: toHm(m.created_at),
      emoji: m.emoji_icon ?? "📍",
      summary: m.content,
      photo_url: m.photo_url ?? null,
      has_music: Boolean(musicTitle),
      music_title: musicTitle,
      mark_id: m.id,
    };
  });

  const timelineFromFeed: TimelineItem[] = feedRows.map((f) => {
    const kind = f.submission_type === "ugc_event_cover" ? "이벤트 커버" : "미션 인증";
    const title = f.events?.title ?? "피드 기록";
    return {
      time: toHm(f.created_at),
      emoji: f.submission_type === "ugc_event_cover" ? "🎨" : "📸",
      summary: `${title} · ${kind}`,
      photo_url: f.image_url ?? null,
      has_music: false,
      music_title: null,
      mark_id: null,
    };
  });

  const timeline = [...timelineFromMarks, ...timelineFromFeed]
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 12);

  const districts = uniqueNonEmpty([
    ...marks.map((m) => m.district),
    ...events.map((e) => e.events?.district ?? null),
    ...feedRows.map((f) => f.events?.district ?? null),
  ]);

  return {
    intro:
      timeline.length > 0
        ? `${charName}와 함께 오늘의 발자국을 시간순으로 정리했어요.`
        : `${charName}와 함께 오늘의 기록을 차분히 돌아봤어요.`,
    timeline,
    outro:
      timeline.length > 0
        ? "오늘 쌓인 순간들이 내일의 더 큰 탐험으로 이어질 거예요."
        : "작은 준비도 탐험의 일부예요. 내일은 한 걸음 더 나아가요.",
    total_marks: marks.length,
    total_checkins: events.length,
    districts_visited: districts,
  };
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
    let autoGenerated = false;
    try {
      const body = await req.json();
      targetDate = body.date ?? new Date().toISOString().slice(0, 10);
      autoGenerated = body.auto_generated === true;
    } catch {
      targetDate = new Date().toISOString().slice(0, 10);
    }

    // ── 2. 캐시 확인 ─────────────────────────────────────────────────
    const { data: existingJournal } = await supabase
      .from("journals")
      .select("journal_text, share_card, format, timeline_data, mark_ids, districts, auto_generated")
      .eq("user_id", user.id)
      .eq("journal_date", targetDate)
      .maybeSingle();

    if (existingJournal) {
      return json({
        journal_text: existingJournal.journal_text,
        share_card: existingJournal.share_card,
        format: existingJournal.format ?? "narrative",
        timeline_data: existingJournal.timeline_data ?? null,
        mark_ids: existingJournal.mark_ids ?? [],
        districts: existingJournal.districts ?? [],
        auto_generated: existingJournal.auto_generated === true,
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("mbti")
      .eq("id", user.id)
      .maybeSingle();
    const mbti = typeof profile?.mbti === "string" ? profile.mbti.toUpperCase() : null;

    // ── 4. 완료 이벤트 조회 ──────────────────────────────────────────
    const dayStart = `${targetDate}T00:00:00`;
    const dayEnd = `${targetDate}T23:59:59`;

    const { data: completions } = await supabase
      .from("event_completions")
      .select("xp_earned, event_id, events(title, address, district, category)")
      .eq("user_id", user.id)
      .gte("completed_at", dayStart)
      .lte("completed_at", dayEnd);

    const events = (completions ?? []) as EventCompletionRow[];

    const { data: marksData } = await supabase
      .from("marks")
      .select("id, content, district, created_at, music_json, photo_url, emoji_icon, xp_granted")
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true })
      .limit(30);
    const marks = (marksData ?? []) as MarkRow[];

    const { data: feedData } = await supabase
      .from("community_submissions")
      .select("id, submission_type, image_url, created_at, event_id, events(title, district)")
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true })
      .limit(20);
    const feedRows = (feedData ?? []) as FeedRow[];

    const placesVisited = events
      .map((c: EventCompletionRow) => c.events?.title ?? null)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    placesVisited.push(
      ...uniqueNonEmpty([
        ...marks.map((m) => m.district),
        ...feedRows.map((f) => f.events?.title ?? null),
      ]),
    );

    const xpEarned =
      events.reduce((sum: number, c: EventCompletionRow) => sum + (c.xp_earned ?? 0), 0) +
      marks.reduce((sum: number, m: MarkRow) => sum + (m.xp_granted ?? 0), 0);

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

    const hasSignals = placesVisited.length > 0 || marks.length > 0 || feedRows.length > 0;
    const prompt = hasSignals
      ? buildJournalPrompt(charName, charType, charLevel, placesVisited, marks, feedRows, xpEarned, mbti)
      : buildNoEventPrompt(charName, charType, charLevel, mbti);

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

    const eventsCompleted = events.map((c: EventCompletionRow) => ({
      event_id: c.event_id,
      title: c.events?.title ?? null,
      category: c.events?.category ?? null,
      xp_earned: c.xp_earned ?? 0,
    }));
    const timelineData = buildTimelineData(marks, feedRows, events, charName);
    const format = timelineData.timeline.length > 0 ? "timeline" : "narrative";
    const markIds = marks.map((m) => m.id);
    const districts = uniqueNonEmpty([
      ...events.map((e) => e.events?.district ?? null),
      ...marks.map((m) => m.district),
      ...feedRows.map((f) => f.events?.district ?? null),
    ]);

    // ── 8. DB 저장 ───────────────────────────────────────────────────
    await supabase.from("journals").insert({
      user_id: user.id,
      journal_date: targetDate,
      journal_text: journalText,
      share_card: shareCard,
      events_completed: eventsCompleted,
      format,
      timeline_data: timelineData,
      mark_ids: markIds,
      districts,
      auto_generated: autoGenerated,
    });

    // ── 9. 응답 ──────────────────────────────────────────────────────
    return json({
      journal_text: journalText,
      share_card: shareCard,
      format,
      timeline_data: timelineData,
      mark_ids: markIds,
      districts,
      auto_generated: autoGenerated,
      cached: false,
    });
  } catch (err) {
    console.error("generate-journal error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
