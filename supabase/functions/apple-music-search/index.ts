import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6?target=deno";

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

export interface AppleMusicTrackResult {
  apple_song_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  preview_url: string | null;
  apple_music_url: string | null;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getDeveloperToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) {
    return cachedToken.token;
  }

  const teamId = Deno.env.get("APPLE_MUSIC_TEAM_ID");
  const keyId = Deno.env.get("APPLE_MUSIC_KEY_ID");
  let pem = Deno.env.get("APPLE_MUSIC_PRIVATE_KEY");
  if (!teamId || !keyId || !pem) {
    throw new Error("APPLE_MUSIC_TEAM_ID / KEY_ID / PRIVATE_KEY 가 설정되지 않았습니다.");
  }
  pem = pem.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("APPLE_MUSIC_PRIVATE_KEY 형식이 올바르지 않습니다.");
  }

  const key = await importPKCS8(pem, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 24 * 60 * 60)
    .sign(key);

  cachedToken = { token, exp: now + 60 * 24 * 60 * 60 };
  return token;
}

function artworkUrl(template: string | undefined, size = 120): string | null {
  if (!template || typeof template !== "string") return null;
  return template
    .replace("{w}", String(size))
    .replace("{h}", String(size));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
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

    const body = (await req.json().catch(() => ({}))) as { q?: string };
    const term = typeof body.q === "string" ? body.q.trim() : "";
    if (term.length < 2) {
      return json({ tracks: [] as AppleMusicTrackResult[] });
    }

    const storefront = Deno.env.get("APPLE_MUSIC_STOREFRONT") ?? "kr";
    const devToken = await getDeveloperToken();

    const url = new URL(
      `https://api.music.apple.com/v1/catalog/${storefront}/search`,
    );
    url.searchParams.set("term", term);
    url.searchParams.set("types", "songs");
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Apple Music API error", res.status, t);
      return json(
        { error: "Apple Music 검색에 실패했습니다.", detail: t.slice(0, 200) },
        502,
      );
    }

    const data = (await res.json()) as {
      results?: {
        songs?: {
          data?: Array<{
            id: string;
            attributes?: {
              name?: string;
              artistName?: string;
              url?: string;
              artwork?: { url?: string };
              previews?: Array<{ url?: string }>;
            };
          }>;
        };
      };
    };

    const songs = data.results?.songs?.data ?? [];
    const tracks: AppleMusicTrackResult[] = songs.map((s) => {
      const a = s.attributes;
      const preview = a?.previews?.[0]?.url ?? null;
      return {
        apple_song_id: s.id,
        title: a?.name ?? "",
        artist: a?.artistName ?? "",
        artwork_url: artworkUrl(a?.artwork?.url),
        preview_url: preview,
        apple_music_url: a?.url ?? null,
      };
    });

    return json({ tracks });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "검색 실패";
    return json({ error: msg }, 500);
  }
});
