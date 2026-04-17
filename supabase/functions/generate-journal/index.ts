import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ──────────────────────────────────────────────────────────────────────────────
// generate-journal (v2 — timeline + marks)
//
// 변경 요약:
//   - 입력: { date?: string, auto_generated?: boolean }
//   - 데이터 소스: checkins + event_completions + public.marks
//   - 흔적이 하나라도 있으면 format='timeline' (구조화 JSON)
//   - 없으면 기존 format='narrative' (하위 호환 텍스트)
//   - 출력 스키마(타임라인):
//       {
//         journal_text: string,          // intro+outro+타임라인 요약을 붙인 평문(공유용)
//         share_card: {...},
//         cached: boolean,
//         format: 'narrative' | 'timeline',
//         timeline_data?: {
//           intro, timeline[], outro,
//           total_marks, total_checkins, districts_visited
//         },
//         mark_ids?: string[],
//         districts?: string[],
//         auto_generated?: boolean
//       }
//
//   - AI 모델: 기존 claude-sonnet-4-20250514 유지 (변경 금지)
//   - max_tokens/temperature: 기존 값 유지 (승인 없음)
//   - public.marks 테이블/컬럼이 없으면 안전하게 narrative로 폴백
// ──────────────────────────────────────────────────────────────────────────────

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
  dodam: { name: "도담", tone: "따뜻하고 편안한 말투, 반말 섞인 친근한 톤" },
  narae: { name: "나래", tone: "에너지 넘치고 활발한 말투, 감탄사 많이 사용" },
  haram: { name: "하람", tone: "지혜롭고 차분한 말투, 깊이 있는 관찰" },
  byeolzzi: { name: "별찌", tone: "귀엽고 장난스러운 말투, 이모티콘 느낌의 표현" },
  // 백엔드에서 character_type이 영어 소문자 외 값을 주는 경우 보호
  default: { name: "도담", tone: "따뜻하고 편안한 말투, 반말 섞인 친근한 톤" },
};

function pickTone(characterType: string | null | undefined) {
  if (!characterType) return CHARACTER_TONE.dodam;
  return CHARACTER_TONE[characterType] ?? CHARACTER_TONE.dodam;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MarkRow {
  id: string;
  content: string | null;
  photo_url: string | null;
  district: string | null;
  emoji_icon: string | null;
  created_at: string;
  music_json: Record<string, unknown> | null;
}

interface TimelineItem {
  time: string;
  emoji: string;
  summary: string;
  mark_id: string | null;
  has_music: boolean;
  music_title: string | null;
  photo_url: string | null;
}

interface TimelineData {
  intro: string;
  timeline: TimelineItem[];
  outro: string;
  total_marks: number;
  total_checkins: number;
  districts_visited: string[];
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildNarrativePrompt(
  characterName: string,
  characterType: string,
  level: number,
  places: string[],
  xpEarned: number,
): string {
  const personality = pickTone(characterType);

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
  const personality = pickTone(characterType);

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

function formatKstHm(iso: string): string {
  try {
    const d = new Date(iso);
    // Asia/Seoul (UTC+9) 단순 오프셋 — Deno 런타임에서 안정적으로 동작
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const hh = String(kst.getUTCHours()).padStart(2, "0");
    const mm = String(kst.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "00:00";
  }
}

function buildTimelinePrompt(
  marks: MarkRow[],
  checkinCount: number,
  districts: string[],
): string {
  const lines = marks.map((m, i) => {
    const time = formatKstHm(m.created_at);
    const emoji = (m.emoji_icon ?? "").trim() || "•";
    const content = (m.content ?? "").replace(/\s+/g, " ").trim() || "(기록 없음)";
    const district = m.district ?? "";
    const music =
      m.music_json && typeof m.music_json === "object"
        ? `${(m.music_json as Record<string, unknown>).title ?? ""}`.trim()
        : "";
    const musicLine = music ? ` / 음악: ${music}` : "";
    const districtLine = district ? ` / 위치: ${district}` : "";
    return `${i + 1}) [${time}] ${emoji} "${content}"${districtLine}${musicLine}`;
  });

  return `당신은 WhereHere 탐험 일지 작가입니다.
사용자의 하루 기록(체크인과 흔적)을 바탕으로 짧고 감성적인 일지를 작성합니다.

포맷:
- 도입 (1문장): 오늘 하루를 한 줄로 요약
- 타임라인: 시간순으로 각 기록을 짧게 언급
  - 각 항목: [시간] [이모지] [한줄 요약] 형식
  - 사용자가 남긴 한줄 텍스트를 자연스럽게 녹여서 작성
  - 음악이 첨부된 기록은 "♪ [곡명]과 함께" 형태로 언급
- 마무리 (1문장): 하루를 따뜻하게 마무리

톤: 편안한 반말체, 감성적이지만 과하지 않게. 이모지 1~2개만.
전체 길이: 150자 이내. 반드시 한국어로 작성.

## 오늘의 데이터
- 체크인 수: ${checkinCount}
- 흔적 수: ${marks.length}
- 방문 구: ${districts.join(", ") || "(없음)"}

## 흔적 원본(시간순)
${lines.join("\n") || "(없음)"}

## 출력 형식 (JSON만, 다른 설명 금지)
{
  "intro": "도입 1문장",
  "timeline": [
    { "index": 1, "time": "HH:MM", "emoji": "이모지", "summary": "한줄 요약" }
  ],
  "outro": "마무리 1문장"
}

- timeline[].index 는 위 "흔적 원본"의 번호(1-based)와 정확히 일치시켜라.
- time/emoji 는 위 원본 값을 그대로 사용해라.
- summary 는 한국어로 20자 이내. 음악이 있으면 "♪ 곡명과 함께" 한 구절을 자연스럽게 포함.`;
}

// ── Claude ───────────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  prompt: string,
  maxTokens = 500,
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
      max_tokens: maxTokens,
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

function parseLooseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // 백틱/마크다운 제거 후 재시도
    const cleaned = raw
      .replace(/^```(json)?/i, "")
      .replace(/```$/m, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
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

    // ── 1. 입력 파싱 ─────────────────────────────────────────────────
    let targetDate: string;
    let autoGenerated = false;
    try {
      const body = await req.json();
      targetDate = body?.date ?? new Date().toISOString().slice(0, 10);
      autoGenerated = body?.auto_generated === true;
    } catch {
      targetDate = new Date().toISOString().slice(0, 10);
    }

    // ── 2. 캐시 확인 ─────────────────────────────────────────────────
    const { data: existingJournal } = await supabase
      .from("journals")
      .select(
        "journal_text, share_card, format, timeline_data, mark_ids, districts, auto_generated",
      )
      .eq("user_id", user.id)
      .eq("journal_date", targetDate)
      .maybeSingle();

    if (existingJournal) {
      return json({
        journal_text: existingJournal.journal_text,
        share_card: existingJournal.share_card,
        cached: true,
        format: existingJournal.format ?? "narrative",
        timeline_data: existingJournal.timeline_data ?? null,
        mark_ids: existingJournal.mark_ids ?? [],
        districts: existingJournal.districts ?? [],
        auto_generated: existingJournal.auto_generated ?? false,
      });
    }

    // ── 3. 캐릭터 정보 조회 ──────────────────────────────────────────
    const { data: character } = await supabase
      .from("characters")
      .select("name, character_type, level, xp")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const charName = character?.name ?? "탐험가";
    const charType = character?.character_type ?? "dodam";
    const charLevel = character?.level ?? 1;

    // ── 4. 하루 범위(KST) ────────────────────────────────────────────
    // 서버 타임존이 UTC 라고 가정하고, KST 자정 → UTC 로 환산해 하루 경계 산출.
    // 간단화를 위해 기존 방식(날짜 문자열 + T00/T23)을 유지하되, 확장성 있게 분리.
    const dayStart = `${targetDate}T00:00:00`;
    const dayEnd = `${targetDate}T23:59:59`;

    // ── 5. 완료 이벤트 조회 ──────────────────────────────────────────
    const { data: completions } = await supabase
      .from("event_completions")
      .select("xp_earned, event_id, events(title, address, district, category)")
      .eq("user_id", user.id)
      .gte("completed_at", dayStart)
      .lte("completed_at", dayEnd);

    const events = (completions ?? []) as Array<{
      xp_earned: number;
      event_id: string;
      events: {
        title?: string | null;
        address?: string | null;
        district?: string | null;
        category?: string | null;
      } | null;
    }>;
    const placesVisited = events
      .map((c) => c.events?.title ?? "")
      .filter((t) => t.length > 0) as string[];
    const xpEarned = events.reduce(
      (sum, c) => sum + (c.xp_earned ?? 0),
      0,
    );
    const eventDistricts = events
      .map((c) => c.events?.district ?? "")
      .filter((d) => d.length > 0);

    // ── 6. 체크인 수(하루) ───────────────────────────────────────────
    const { count: checkinCountRaw } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);
    const checkinCount = typeof checkinCountRaw === "number" ? checkinCountRaw : 0;

    // ── 7. 마크(흔적) 조회 (public.marks 없을 수 있음) ───────────────
    let marks: MarkRow[] = [];
    try {
      const { data: markRows, error: markErr } = await supabase
        .from("marks")
        .select(
          "id, content, photo_url, district, emoji_icon, created_at, music_json",
        )
        .eq("user_id", user.id)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: true });
      if (markErr) {
        console.warn("marks table query failed (continuing):", markErr.message);
      } else {
        marks = (markRows ?? []) as MarkRow[];
      }
    } catch (e) {
      console.warn("marks table not available, falling back:", (e as Error).message);
    }

    const markDistricts = marks
      .map((m) => m.district ?? "")
      .filter((d) => d.length > 0);
    const districtsVisited = Array.from(
      new Set([...eventDistricts, ...markDistricts]),
    );

    // ── 8. 배지(하루) ────────────────────────────────────────────────
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("badges(name)")
      .eq("user_id", user.id)
      .gte("earned_at", dayStart)
      .lte("earned_at", dayEnd);

    const badgeRows = (badgesData ?? []) as Array<{
      badges: { name: string } | null;
    }>;
    const badgesEarned: string[] = [];
    for (const b of badgeRows) {
      const n = b.badges?.name;
      if (typeof n === "string" && n.length > 0) badgesEarned.push(n);
    }

    // ── 9. AI 호출 ───────────────────────────────────────────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not set");
      return json(
        { error: "일지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." },
        500,
      );
    }

    const useTimeline = marks.length > 0;

    let format: "narrative" | "timeline" = "narrative";
    let journalText = "";
    let timelineData: TimelineData | null = null;

    if (useTimeline) {
      // ── 타임라인 모드 ─────────────────────────────────────────────
      const prompt = buildTimelinePrompt(marks, checkinCount, districtsVisited);
      const raw = await callClaude(apiKey, prompt, 600);

      if (!raw) {
        return json(
          { error: "일지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." },
          500,
        );
      }

      const parsed = parseLooseJson(raw) as
        | {
            intro?: string;
            outro?: string;
            timeline?: Array<{
              index?: number;
              time?: string;
              emoji?: string;
              summary?: string;
            }>;
          }
        | null;

      const aiTimeline = Array.isArray(parsed?.timeline) ? parsed!.timeline! : [];

      // 실제 marks 와 1:1 매핑 (AI가 순서를 흐트러도 원본이 truth)
      const items: TimelineItem[] = marks.map((m, i) => {
        const hit = aiTimeline.find(
          (t) => typeof t?.index === "number" && t.index === i + 1,
        );
        const music = m.music_json as Record<string, unknown> | null;
        const musicTitle =
          music && typeof music.title === "string"
            ? (music.title as string)
            : null;
        return {
          time: (hit?.time ?? formatKstHm(m.created_at)).slice(0, 5),
          emoji: hit?.emoji ?? m.emoji_icon ?? "•",
          summary:
            (hit?.summary ?? m.content ?? "").toString().trim().slice(0, 40) ||
            "기록을 남겼다",
          mark_id: m.id,
          has_music: !!musicTitle,
          music_title: musicTitle,
          photo_url: m.photo_url,
        };
      });

      const intro =
        (parsed?.intro ?? "").toString().trim() ||
        `오늘은 ${districtsVisited[0] ?? "도시"}를 거닐었다`;
      const outro =
        (parsed?.outro ?? "").toString().trim() ||
        "작은 발견이 모여 하루가 됐다";

      timelineData = {
        intro,
        timeline: items,
        outro,
        total_marks: marks.length,
        total_checkins: checkinCount,
        districts_visited: districtsVisited,
      };

      // 공유/레거시용 평문
      const lines = [
        intro,
        ...items.map(
          (it) =>
            `${it.time} ${it.emoji} ${it.summary}${
              it.has_music && it.music_title ? ` ♪ ${it.music_title}` : ""
            }`,
        ),
        outro,
      ];
      journalText = lines.filter(Boolean).join("\n");
      format = "timeline";
    } else {
      // ── 서술형(narrative) 모드 — 기존 하위 호환 ────────────────────
      const hasEvents = placesVisited.length > 0;
      const prompt = hasEvents
        ? buildNarrativePrompt(
            charName,
            charType,
            charLevel,
            placesVisited,
            xpEarned,
          )
        : buildNoEventPrompt(charName, charType, charLevel);

      const text = await callClaude(apiKey, prompt, 500);
      if (!text) {
        return json(
          { error: "일지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." },
          500,
        );
      }
      journalText = text;
      format = "narrative";
    }

    // ── 10. share_card / events_completed ────────────────────────────
    const shareCard = {
      character_name: charName,
      places_visited: placesVisited,
      xp_earned: xpEarned,
      badges_earned: badgesEarned,
    };

    const eventsCompleted = events.map((c) => ({
      event_id: c.event_id,
      title: c.events?.title ?? null,
      category: c.events?.category ?? null,
      xp_earned: c.xp_earned,
    }));

    const markIds = marks.map((m) => m.id);

    // ── 11. DB 저장 ──────────────────────────────────────────────────
    // 확장 컬럼이 마이그레이션 전일 수도 있으므로, 단계적으로 안전 저장.
    const baseRow: Record<string, unknown> = {
      user_id: user.id,
      journal_date: targetDate,
      journal_text: journalText,
      share_card: shareCard,
      events_completed: eventsCompleted,
    };

    const extendedRow: Record<string, unknown> = {
      ...baseRow,
      format,
      timeline_data: timelineData,
      mark_ids: markIds,
      districts: districtsVisited,
      auto_generated: autoGenerated,
    };

    let saved = false;
    const extIns = await supabase.from("journals").insert(extendedRow);
    if (extIns.error) {
      console.warn(
        "journal insert (extended) failed, retry with base row:",
        extIns.error.message,
      );
      const baseIns = await supabase.from("journals").insert(baseRow);
      if (baseIns.error) {
        console.error("journal insert (base) failed:", baseIns.error.message);
      } else {
        saved = true;
      }
    } else {
      saved = true;
    }

    if (!saved) {
      // 저장 실패해도 응답은 반환(다음 호출에서 캐시 미스로 재생성됨)
      console.error("journal could not be persisted for user", user.id, targetDate);
    }

    // ── 12. 응답 ─────────────────────────────────────────────────────
    return json({
      journal_text: journalText,
      share_card: shareCard,
      cached: false,
      format,
      timeline_data: timelineData,
      mark_ids: markIds,
      districts: districtsVisited,
      auto_generated: autoGenerated,
    });
  } catch (err) {
    console.error("generate-journal error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
