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

const STAT_MAP: Record<string, string> = {
  gps_checkin: "stat_exploration",
  photo: "stat_creativity",
  quiz: "stat_knowledge",
  text: "stat_creativity",
  timer: "stat_exploration",
};

const EVOLUTION_THRESHOLDS: { minLevel: number; stage: number; label: string }[] = [
  { minLevel: 31, stage: 4, label: "Legendary" },
  { minLevel: 16, stage: 3, label: "Adult" },
  { minLevel: 6, stage: 2, label: "Teen" },
];

function xpForLevel(level: number): number {
  return level * 500;
}

function computeLevel(totalXp: number): number {
  let level = 1;
  let cumulative = 0;
  while (cumulative + xpForLevel(level) <= totalXp) {
    cumulative += xpForLevel(level);
    level++;
  }
  return level;
}

function evolutionStage(level: number): { stage: number; label: string } {
  for (const t of EVOLUTION_THRESHOLDS) {
    if (level >= t.minLevel) return { stage: t.stage, label: t.label };
  }
  return { stage: 1, label: "Baby" };
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
      .select("*")
      .eq("id", event_id)
      .single();
    if (eventErr || !event) return json({ error: "이벤트를 찾을 수 없습니다." }, 404);

    // ── 2. 이미 완료 여부 ───────────────────────────────────────────
    const { data: existing } = await supabase
      .from("event_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", event_id)
      .maybeSingle();
    if (existing) return json({ error: "이미 완료한 이벤트입니다." }, 400);

    // ── 3. 필수 미션 완료 검증 ──────────────────────────────────────
    const { data: requiredMissions } = await supabase
      .from("missions")
      .select("id, mission_type")
      .eq("event_id", event_id)
      .eq("required", true);

    if (!requiredMissions || requiredMissions.length === 0) {
      return json({ error: "이벤트에 미션이 없습니다." }, 400);
    }

    const requiredIds = requiredMissions.map((m: { id: string }) => m.id);

    const { data: completions } = await supabase
      .from("mission_completions")
      .select("mission_id")
      .eq("user_id", user.id)
      .eq("event_id", event_id)
      .in("mission_id", requiredIds);

    const completedIds = new Set(
      (completions ?? []).map((c: { mission_id: string }) => c.mission_id),
    );

    if (requiredIds.some((id: string) => !completedIds.has(id))) {
      return json({ error: "모든 필수 미션을 완료해주세요." }, 400);
    }

    // ── 4. 완료한 전체 미션(선택 포함) 타입 수집 ────────────────────
    const { data: allMissions } = await supabase
      .from("missions")
      .select("id, mission_type")
      .eq("event_id", event_id);

    const { data: allCompletions } = await supabase
      .from("mission_completions")
      .select("mission_id")
      .eq("user_id", user.id)
      .eq("event_id", event_id);

    const allCompletedIds = new Set(
      (allCompletions ?? []).map((c: { mission_id: string }) => c.mission_id),
    );

    const completedTypes: string[] = (allMissions ?? [])
      .filter((m: { id: string }) => allCompletedIds.has(m.id))
      .map((m: { mission_type: string }) => m.mission_type);

    // ── 5. 스탯 증가 계산 ───────────────────────────────────────────
    const statsIncrease: Record<string, number> = {};
    for (const mt of completedTypes) {
      const col = STAT_MAP[mt];
      if (col) {
        const short = col.replace("stat_", "");
        statsIncrease[short] = (statsIncrease[short] ?? 0) + 1;
      }
    }

    // ── 6. 캐릭터 업데이트 ──────────────────────────────────────────
    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const xpEarned = event.reward_xp ?? 0;
    let characterResult = null;

    if (character) {
      const prevLevel = character.level;
      const prevStage = character.evolution_stage;
      const newXp = character.xp + xpEarned;
      const newLevel = computeLevel(newXp);
      const { stage: newStage } = evolutionStage(newLevel);

      const updatePayload: Record<string, number> = {
        xp: newXp,
        level: newLevel,
        evolution_stage: newStage,
      };

      for (const [short, inc] of Object.entries(statsIncrease)) {
        const col = `stat_${short}`;
        updatePayload[col] = (character[col] ?? 10) + inc;
      }

      await supabase
        .from("characters")
        .update(updatePayload)
        .eq("id", character.id);

      characterResult = {
        previous_level: prevLevel,
        new_level: newLevel,
        level_up: newLevel > prevLevel,
        evolution: newStage > prevStage,
        evolution_stage: newStage,
        total_xp: newXp,
        stats_increased: statsIncrease,
      };
    }

    // ── 7. 프로필 XP 갱신 ───────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, level")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newTotalXp = (profile.total_xp ?? 0) + xpEarned;
      const newProfileLevel = computeLevel(newTotalXp);
      await supabase
        .from("profiles")
        .update({ total_xp: newTotalXp, level: newProfileLevel })
        .eq("id", user.id);
    }

    // ── 8. 배지 확인 & 부여 ─────────────────────────────────────────
    const badgesEarned: { id: string; name: string; rarity: string }[] = [];

    const { count: totalCompleted } = await supabase
      .from("event_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const completedCount = (totalCompleted ?? 0) + 1;

    const { count: districtCount } = await supabase
      .from("event_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in(
        "event_id",
        (await supabase.from("events").select("id").eq("district", event.district)).data?.map(
          (e: { id: string }) => e.id,
        ) ?? [],
      );
    const districtCompleted = (districtCount ?? 0) + 1;

    const { count: categoryCount } = await supabase
      .from("event_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in(
        "event_id",
        (await supabase.from("events").select("id").eq("category", event.category)).data?.map(
          (e: { id: string }) => e.id,
        ) ?? [],
      );
    const categoryCompleted = (categoryCount ?? 0) + 1;

    const { data: allBadges } = await supabase.from("badges").select("*");
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.id);
    const ownedBadgeIds = new Set(
      (userBadges ?? []).map((b: { badge_id: string }) => b.badge_id),
    );

    for (const badge of allBadges ?? []) {
      if (ownedBadgeIds.has(badge.id)) continue;

      const rv = badge.requirement_value as Record<string, unknown>;
      let earned = false;

      switch (badge.requirement_type) {
        case "events_completed":
          earned = completedCount >= ((rv.min as number) ?? Infinity);
          break;
        case "district_completed":
          earned =
            event.district === rv.district &&
            districtCompleted >= ((rv.min as number) ?? 5);
          break;
        case "category_events_completed":
          earned =
            event.category === rv.category &&
            categoryCompleted >= ((rv.min as number) ?? 3);
          break;
        case "seasonal_events_completed":
          if (event.is_seasonal) {
            const { count: seasonalCnt } = await supabase
              .from("event_completions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in(
                "event_id",
                (await supabase.from("events").select("id").eq("is_seasonal", true)).data?.map(
                  (e: { id: string }) => e.id,
                ) ?? [],
              );
            earned = ((seasonalCnt ?? 0) + 1) >= ((rv.min as number) ?? 1);
          }
          break;
        case "quiz_missions_passed": {
          const { count: quizCnt } = await supabase
            .from("mission_completions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in(
              "mission_id",
              (await supabase.from("missions").select("id").eq("mission_type", "quiz")).data?.map(
                (m: { id: string }) => m.id,
              ) ?? [],
            );
          earned = (quizCnt ?? 0) >= ((rv.min as number) ?? 10);
          break;
        }
        case "photo_missions_submitted": {
          const { count: photoCnt } = await supabase
            .from("mission_completions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in(
              "mission_id",
              (await supabase.from("missions").select("id").eq("mission_type", "photo")).data?.map(
                (m: { id: string }) => m.id,
              ) ?? [],
            );
          earned = (photoCnt ?? 0) >= ((rv.min as number) ?? 5);
          break;
        }
      }

      if (earned) {
        await supabase.from("user_badges").insert({
          user_id: user.id,
          badge_id: badge.id,
          event_id,
        });
        badgesEarned.push({
          id: badge.id,
          name: badge.name,
          rarity: badge.rarity,
        });
      }
    }

    // ── 9. 아이템 드롭 (난이도 기반 확률) ───────────────────────────
    const itemsEarned: { id: string; name: string; rarity: string }[] = [];

    const dropTable: { name: string; rarity: string; chance: number; minDifficulty: number }[] = [
      { name: "일반 부스터", rarity: "common", chance: 0.5, minDifficulty: 1 },
      { name: "고급 부스터", rarity: "rare", chance: 0.25, minDifficulty: 2 },
      { name: "골든 부스터", rarity: "epic", chance: 0.1, minDifficulty: 3 },
      { name: "전설의 부스터", rarity: "legendary", chance: 0.03, minDifficulty: 4 },
    ];

    for (const drop of dropTable) {
      if (event.difficulty >= drop.minDifficulty && Math.random() < drop.chance) {
        const { data: item } = await supabase
          .from("inventory_items")
          .insert({
            user_id: user.id,
            item_type: "booster",
            item_name: drop.name,
            rarity: drop.rarity,
            quantity: 1,
          })
          .select("id, item_name, rarity")
          .single();

        if (item) {
          itemsEarned.push({
            id: item.id,
            name: item.item_name,
            rarity: item.rarity,
          });
        }
      }
    }

    // ── 10. event_completions 기록 ──────────────────────────────────
    const rewardsPayload = {
      xp: xpEarned,
      badges: badgesEarned.map((b) => b.id),
      items: itemsEarned.map((i) => i.id),
    };

    await supabase.from("event_completions").insert({
      user_id: user.id,
      event_id,
      rewards_earned: rewardsPayload,
      xp_earned: xpEarned,
    });

    // ── 11. 응답 ────────────────────────────────────────────────────
    return json({
      success: true,
      rewards: {
        xp_earned: xpEarned,
        badges_earned: badgesEarned,
        items_earned: itemsEarned,
      },
      character: characterResult,
    });
  } catch (err) {
    console.error("complete-event error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
