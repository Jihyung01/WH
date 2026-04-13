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

type EvolutionStage = "teen" | "adult" | "legendary";
type CharacterType = "dodam" | "narae" | "haram" | "byeolzzi";

function normalizeStage(stage: unknown): EvolutionStage | null {
  const s = typeof stage === "string" ? stage.trim().toLowerCase() : "";
  if (s === "teen" || s === "adult" || s === "legendary") return s;
  return null;
}

function normalizeType(t: unknown): CharacterType | null {
  const s = typeof t === "string" ? t.trim().toLowerCase() : "";
  if (s === "dodam" || s === "narae" || s === "haram" || s === "byeolzzi") return s;
  return null;
}

function buildPrompt(params: {
  character_type: CharacterType;
  evolution_stage: EvolutionStage;
  personality_traits: string[];
  favorite_district: string | null;
}): string {
  const typeDesc: Record<CharacterType, string> = {
    dodam:
      "A warm, friendly forest spirit with green theme. Round, soft features.",
    narae:
      "An energetic wind explorer with blue theme. Dynamic, flowing design.",
    haram:
      "A wise sun guardian with warm orange theme. Serene, noble posture.",
    byeolzzi:
      "A playful star collector with purple theme. Sparkly, mischievous look.",
  };

  const stageDesc: Record<EvolutionStage, string> = {
    teen:
      "Slightly taller than baby form, more defined features, small accessories.",
    adult:
      "Confident posture, refined silhouette, more detailed outfit and accessories.",
    legendary:
      "Majestic, rare aura effect, intricate details, heroic pose.",
  };

  const traits = params.personality_traits
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .slice(0, 3);

  return [
    "Generate a cute, stylized character illustration for a mobile app called WhereHere.",
    "",
    `Character: ${params.character_type}`,
    `- ${params.character_type}: ${typeDesc[params.character_type]}`,
    "",
    `Evolution stage: ${params.evolution_stage}`,
    `- ${params.evolution_stage}: ${stageDesc[params.evolution_stage]}`,
    "",
    `Personality traits: ${traits.length ? traits.join(", ") : "none"}`,
    `Favorite area: ${params.favorite_district ?? "unknown"}`,
    "",
    "Style: Cute Korean mobile game character art, chibi-style, clean lines,",
    "pastel colors with vibrant accents, white or transparent background,",
    "full body view, facing slightly left.",
    "",
    "Do NOT include any text in the image.",
  ].join("\n");
}

async function generateImageBase64(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY")?.trim();
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY_MISSING");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

  const res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GEMINI_FAILED:${res.status}:${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const c of candidates) {
    const parts = c?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const p of parts) {
      const b64 =
        typeof p?.inlineData?.data === "string" ? p.inlineData.data : null;
      if (b64 && b64.length > 50) return b64;
    }
  }

  throw new Error("GEMINI_NO_IMAGE");
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    // This function is internal-only. Caller must provide service role key.
    const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!serviceRole || provided !== serviceRole) {
      return json({ error: "forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as {
      user_id?: string;
      character_type?: string;
      evolution_stage?: string;
      personality_traits?: unknown;
      favorite_district?: string | null;
    };

    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const characterType = normalizeType(body.character_type);
    const stage = normalizeStage(body.evolution_stage);

    const traits = Array.isArray(body.personality_traits)
      ? body.personality_traits.filter((t) => typeof t === "string")
      : [];

    if (!userId || !characterType || !stage) {
      return json({ error: "invalid_request" }, 400);
    }

    const prompt = buildPrompt({
      character_type: characterType,
      evolution_stage: stage,
      personality_traits: traits as string[],
      favorite_district:
        typeof body.favorite_district === "string" ? body.favorite_district : null,
    });

    const b64 = await generateImageBase64(prompt);
    const bytes = decodeBase64ToBytes(b64);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRole,
    );

    const path = `character-evolutions/${userId}/${stage}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("character-evolutions")
      .upload(path, bytes, { contentType: "image/png", upsert: true });

    if (upErr) return json({ error: upErr.message }, 500);

    const { data: pub } = supabaseAdmin.storage
      .from("character-evolutions")
      .getPublicUrl(path);

    const publicUrl = pub?.publicUrl;
    if (!publicUrl) return json({ error: "public_url_failed" }, 500);

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
      "set_character_evolution_image",
      { p_user_id: userId, p_stage: stage, p_url: publicUrl },
    );

    if (rpcErr) return json({ error: rpcErr.message }, 500);

    return json({ success: true, image_url: publicUrl, meta: rpcData });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});

