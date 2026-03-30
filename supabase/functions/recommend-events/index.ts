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

interface CompletedEvent {
  event_id: string;
  category: string;
  district: string | null;
  difficulty: number;
  completed_at: string;
}

interface CandidateEvent {
  id: string;
  title: string;
  description: string | null;
  narrative: string | null;
  address: string | null;
  district: string | null;
  category: string;
  difficulty: number;
  reward_xp: number;
  creator_type: string;
  partner_name: string | null;
  is_active: boolean;
  is_seasonal: boolean;
  season_id: string | null;
  created_at: string;
  expires_at: string | null;
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

    // ── 1. User's character info ────────────────────────────────────
    const { data: character } = await supabase
      .from("characters")
      .select("level, character_type")
      .eq("user_id", user.id)
      .maybeSingle();

    const userLevel = character?.level ?? 1;

    // ── 2. Last 20 completed events with category/district/difficulty
    const { data: completionRows } = await supabase
      .from("event_completions")
      .select("event_id, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(20);

    const completions = completionRows ?? [];
    const completedEventIds = completions.map((c: { event_id: string }) => c.event_id);

    let history: CompletedEvent[] = [];

    if (completedEventIds.length > 0) {
      const { data: historyEvents } = await supabase
        .from("events")
        .select("id, category, district, difficulty")
        .in("id", completedEventIds);

      const completionMap = new Map(
        completions.map((c: { event_id: string; completed_at: string }) => [c.event_id, c.completed_at]),
      );

      history = (historyEvents ?? []).map((e: { id: string; category: string; district: string | null; difficulty: number }) => ({
        event_id: e.id,
        category: e.category,
        district: e.district,
        difficulty: e.difficulty,
        completed_at: completionMap.get(e.id) ?? "",
      }));
    }

    // ── 3. Compute user preferences ─────────────────────────────────
    const categoryCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};
    const recentIds = new Set(completedEventIds.slice(0, 5));

    for (const h of history) {
      categoryCounts[h.category] = (categoryCounts[h.category] ?? 0) + 1;
      if (h.district) {
        districtCounts[h.district] = (districtCounts[h.district] ?? 0) + 1;
      }
    }

    const favoriteCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const favoriteDistrict = Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const visitedCategories = new Set(Object.keys(categoryCounts));

    // ── 4. All completed event IDs (not just recent 20) ─────────────
    let allCompletedIds = completedEventIds;
    if (completions.length === 20) {
      const { data: allRows } = await supabase
        .from("event_completions")
        .select("event_id")
        .eq("user_id", user.id);
      allCompletedIds = (allRows ?? []).map((r: { event_id: string }) => r.event_id);
    }

    // ── 5. Candidate events (active, not completed) ─────────────────
    let query = supabase
      .from("events")
      .select("id, title, description, narrative, address, district, category, difficulty, reward_xp, creator_type, partner_name, is_active, is_seasonal, season_id, created_at, expires_at")
      .eq("is_active", true);

    if (allCompletedIds.length > 0) {
      query = query.not("id", "in", `(${allCompletedIds.join(",")})`);
    }

    const { data: candidates, error: candidateErr } = await query.limit(100);

    if (candidateErr) {
      console.error("candidate query error:", candidateErr);
      return json({ error: "이벤트 조회에 실패했습니다." }, 500);
    }

    if (!candidates || candidates.length === 0) {
      return json([]);
    }

    // ── 6. Fallback: no history → return first 10 events ────────────
    if (history.length === 0) {
      const fallback = (candidates as CandidateEvent[])
        .slice(0, 10)
        .map((e) => ({ ...e, event_id: e.id, score: 0 }));
      return json(fallback);
    }

    // ── 7. Score each candidate ─────────────────────────────────────
    const scored = (candidates as CandidateEvent[]).map((event) => {
      let score = 0;

      if (favoriteCategory && event.category === favoriteCategory) {
        score += 3;
      }

      if (favoriteDistrict && event.district === favoriteDistrict) {
        score += 2;
      }

      if (Math.abs(event.difficulty - userLevel) <= 1) {
        score += 2;
      }

      if (!visitedCategories.has(event.category)) {
        score += 1;
      }

      if (recentIds.has(event.id)) {
        score -= 1;
      }

      return { ...event, event_id: event.id, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return json(scored.slice(0, 10));
  } catch (err) {
    console.error("recommend-events error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
