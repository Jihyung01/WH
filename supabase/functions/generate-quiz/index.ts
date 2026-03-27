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

interface QuizData {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

function fallbackQuiz(title: string, district: string): QuizData {
  return {
    question: `${district}에 있는 "${title}" 근처에서 가장 많이 볼 수 있는 것은?`,
    options: ["카페와 음식점", "대형 쇼핑몰", "자연 공원", "산업 단지"],
    correct_index: 0,
    explanation: `${district} 일대는 다양한 카페와 음식점이 밀집해 있는 지역입니다.`,
  };
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const braces = raw.match(/\{[\s\S]*\}/);
  if (braces) return braces[0];

  return raw.trim();
}

function parseQuiz(raw: string): QuizData | null {
  try {
    const cleaned = extractJson(raw);
    const obj = JSON.parse(cleaned);

    if (
      typeof obj.question !== "string" ||
      !Array.isArray(obj.options) ||
      obj.options.length < 2 ||
      typeof obj.correct_index !== "number" ||
      typeof obj.explanation !== "string"
    ) {
      return null;
    }

    if (obj.correct_index < 0 || obj.correct_index >= obj.options.length) {
      obj.correct_index = 0;
    }

    return obj as QuizData;
  } catch {
    return null;
  }
}

async function callClaude(
  apiKey: string,
  title: string,
  district: string,
): Promise<QuizData> {
  const prompt = `Create a fun trivia quiz question about this location in Korea.
Place: ${title}, ${district}
The question should be interesting and educational.
Write in Korean.

Respond in this exact JSON format only, no other text:
{
  "question": "질문",
  "options": ["보기1", "보기2", "보기3", "보기4"],
  "correct_index": 0,
  "explanation": "해설"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Claude API error:", res.status, err);
    return fallbackQuiz(title, district);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  return parseQuiz(text) ?? fallbackQuiz(title, district);
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

    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("title, district, address, category, description")
      .eq("id", event_id)
      .single();
    if (eventErr || !event) {
      return json({ error: "이벤트를 찾을 수 없습니다." }, 404);
    }

    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!claudeKey) {
      console.warn("ANTHROPIC_API_KEY not set — returning fallback quiz");
      return json(fallbackQuiz(event.title, event.district ?? "서울"));
    }

    const quiz = await callClaude(
      claudeKey,
      event.title,
      event.district ?? "서울",
    );

    return json(quiz);
  } catch (err) {
    console.error("generate-quiz error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
