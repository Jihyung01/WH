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

// ── 코스메틱 드롭 확률 테이블 ──────────────────────────────────────────
const COSMETIC_DROP_TABLE: { rarity: string; baseChance: number }[] = [
  { rarity: "common", baseChance: 0.25 },
  { rarity: "rare", baseChance: 0.08 },
  { rarity: "epic", baseChance: 0.015 },
  { rarity: "legendary", baseChance: 0.003 },
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

function evolutionStageKey(stageNum: number): "teen" | "adult" | "legendary" | null {
  if (stageNum === 2) return "teen";
  if (stageNum === 3) return "adult";
  if (stageNum === 4) return "legendary";
  return null;
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

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      // 게이트웨이 JWT 검증을 끈 뒤에도 실패하면, 여기 메시지로 원인 구분 가능 (만료/형식 등).
      const msg = authError?.message?.trim() || "인증 실패";
      return json({ error: msg }, 401);
    }

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
    let characterResult: Record<string, unknown> | null = null;

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

      // ── Evolution AI image (internal Edge Function) ───────────────────────
      let evolutionImageUrl: string | null = null;
      const didEvolve = newStage > prevStage;
      const stageKey = didEvolve ? evolutionStageKey(newStage) : null;
      if (didEvolve && stageKey) {
        try {
          const { data: updatedChar } = await supabase
            .from("characters")
            .select("character_type, personality_traits, favorite_district")
            .eq("id", character.id)
            .single();

          const fnUrl = `${Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "")}/functions/v1/generate-evolution-image`;
          const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          const resp = await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${srk}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              character_type: updatedChar?.character_type ?? character.character_type,
              evolution_stage: stageKey,
              personality_traits: updatedChar?.personality_traits ?? [],
              favorite_district: updatedChar?.favorite_district ?? null,
            }),
          });
          if (resp.ok) {
            const out = await resp.json().catch(() => null) as { image_url?: string } | null;
            evolutionImageUrl = typeof out?.image_url === "string" ? out.image_url : null;
          }
        } catch {
          // non-critical
        }
      }

      characterResult = {
        previous_level: prevLevel,
        new_level: newLevel,
        level_up: newLevel > prevLevel,
        evolution: didEvolve,
        evolution_stage: newStage,
        evolution_image_url: evolutionImageUrl,
        total_xp: newXp,
        stats_increased: statsIncrease,
        personality_updated: false,
        new_traits: null,
      };
    }

    // ── 7. 프로필 XP 갱신 + 장착 효과 조회 ───────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, level, coins, is_premium")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium ?? false;

    if (profile) {
      const newTotalXp = (profile.total_xp ?? 0) + xpEarned;
      const newProfileLevel = computeLevel(newTotalXp);
      await supabase
        .from("profiles")
        .update({ total_xp: newTotalXp, level: newProfileLevel })
        .eq("id", user.id);
    }

    // 장착 효과 조회 (coin_bonus)
    let coinBonusRate = 0;
    const { data: loadoutItems } = await supabase
      .from("character_loadout")
      .select("cosmetic_id, cosmetic:character_cosmetics(effect_type, effect_value)")
      .eq("user_id", user.id);

    if (loadoutItems) {
      for (const item of loadoutItems) {
        const cosmetic = item.cosmetic as { effect_type: string; effect_value: number } | null;
        if (cosmetic?.effect_type === "coin_bonus") {
          coinBonusRate += cosmetic.effect_value ?? 0;
        }
      }
    }

    // ── 8. 코인 보상 ──────────────────────────────────────────────────
    const difficulty = event.difficulty ?? 1;
    let coinsEarned = difficulty * 20;
    coinsEarned = Math.round(coinsEarned * (1 + coinBonusRate));
    if (isPremium) coinsEarned = Math.round(coinsEarned * 1.5);

    await supabase
      .from("profiles")
      .update({ coins: (profile?.coins ?? 0) + coinsEarned })
      .eq("id", user.id);

    // ── 9. 배지 확인 & 부여 ─────────────────────────────────────────
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

    // ── 10. 기존 아이템 드롭 (부스터) ─────────────────────────────────
    const itemsEarned: { id: string; name: string; rarity: string }[] = [];

    const boosterDropTable: { name: string; rarity: string; chance: number; minDifficulty: number }[] = [
      { name: "일반 부스터", rarity: "common", chance: 0.5, minDifficulty: 1 },
      { name: "고급 부스터", rarity: "rare", chance: 0.25, minDifficulty: 2 },
      { name: "골든 부스터", rarity: "epic", chance: 0.1, minDifficulty: 3 },
      { name: "전설의 부스터", rarity: "legendary", chance: 0.03, minDifficulty: 4 },
    ];

    for (const drop of boosterDropTable) {
      if (difficulty >= drop.minDifficulty && Math.random() < drop.chance) {
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

    // ── 11. 코스메틱 드롭 ──────────────────────────────────────────────
    const cosmeticsDropped: { id: string; name: string; rarity: string; slot: string; preview_emoji: string }[] = [];

    // 유저가 이미 보유한 코스메틱 ID 조회
    const { data: ownedCosmetics } = await supabase
      .from("user_cosmetics")
      .select("cosmetic_id")
      .eq("user_id", user.id);
    const ownedCosmeticIds = new Set(
      (ownedCosmetics ?? []).map((c: { cosmetic_id: string }) => c.cosmetic_id),
    );

    // quest/drop 가능한 코스메틱 조회
    const { data: droppableCosmetics } = await supabase
      .from("character_cosmetics")
      .select("id, name, rarity, slot, preview_emoji")
      .eq("unlock_method", "quest");

    if (droppableCosmetics && droppableCosmetics.length > 0) {
      const difficultyMultiplier = 1 + (difficulty - 1) * 0.2; // diff 1=1.0, diff 5=1.8
      const premiumMultiplier = isPremium ? 1.5 : 1;
      const bonusMultiplier = 1 + coinBonusRate;

      for (const dropEntry of COSMETIC_DROP_TABLE) {
        const adjustedChance = dropEntry.baseChance * difficultyMultiplier * premiumMultiplier * bonusMultiplier;

        if (Math.random() < adjustedChance) {
          // 해당 레어리티의 미보유 코스메틱 중 랜덤 선택
          const candidates = droppableCosmetics.filter(
            (c: { id: string; rarity: string }) =>
              c.rarity === dropEntry.rarity && !ownedCosmeticIds.has(c.id),
          );

          if (candidates.length > 0) {
            const picked = candidates[Math.floor(Math.random() * candidates.length)];

            await supabase.from("user_cosmetics").insert({
              user_id: user.id,
              cosmetic_id: picked.id,
              acquired_via: "drop",
            });

            cosmeticsDropped.push({
              id: picked.id,
              name: picked.name,
              rarity: picked.rarity,
              slot: picked.slot,
              preview_emoji: picked.preview_emoji,
            });

            ownedCosmeticIds.add(picked.id);
          }
        }
      }
    }

    // ── 12. 칭호 달성 체크 ────────────────────────────────────────────
    let titlesEarned: { id: string; name: string; rarity: string }[] = [];
    try {
      const { data: titleResult } = await supabase.rpc("check_and_grant_titles", {
        p_user_id: user.id,
      });
      if (titleResult?.newly_earned_titles) {
        titlesEarned = titleResult.newly_earned_titles;
      }
    } catch (titleErr) {
      console.error("check_and_grant_titles error (non-fatal):", titleErr);
    }

    // ── 13. 성격 업데이트 (매 5회마다) ────────────────────────────────
    let personalityUpdated = false;
    let newTraits: string[] | null = null;

    if (completedCount % 5 === 0) {
      try {
        const { data: personalityResult } = await supabase.rpc("update_character_personality", {
          p_user_id: user.id,
        });
        if (personalityResult) {
          personalityUpdated = true;
          newTraits = personalityResult.traits ?? null;
        }
      } catch (persErr) {
        console.error("update_character_personality error (non-fatal):", persErr);
      }
    }

    if (characterResult) {
      characterResult.personality_updated = personalityUpdated;
      characterResult.new_traits = newTraits;
    }

    // ── 14. event_completions 기록 ───────────────────────────────────
    const rewardsPayload = {
      xp: xpEarned,
      coins: coinsEarned,
      badges: badgesEarned.map((b) => b.id),
      items: itemsEarned.map((i) => i.id),
      cosmetics: cosmeticsDropped.map((c) => c.id),
      titles: titlesEarned.map((t) => t.id),
    };

    await supabase.from("event_completions").insert({
      user_id: user.id,
      event_id,
      rewards_earned: rewardsPayload,
      xp_earned: xpEarned,
    });

    // ── 15. 응답 ────────────────────────────────────────────────────
    return json({
      success: true,
      rewards: {
        xp_earned: xpEarned,
        coins_earned: coinsEarned,
        badges_earned: badgesEarned,
        items_earned: itemsEarned,
        cosmetics_dropped: cosmeticsDropped,
        titles_earned: titlesEarned,
      },
      character: characterResult,
    });
  } catch (err) {
    console.error("complete-event error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
