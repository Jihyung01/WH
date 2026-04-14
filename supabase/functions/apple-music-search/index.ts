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

function storefrontToItunesCountry(storefront: string): string {
  const sf = storefront.trim().toLowerCase();
  if (sf.length === 2) return sf;
  const m = sf.match(/^[a-z]{2}/);
  return m ? m[0] : "kr";
}

async function fallbackItunesSearch(term: string, storefront: string): Promise<AppleMusicTrackResult[]> {
  const country = storefrontToItunesCountry(storefront);
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", term);
  u.searchParams.set("country", country);
  u.searchParams.set("media", "music");
  u.searchParams.set("entity", "song");
  u.searchParams.set("limit", "20");

  const r = await fetch(u.toString());
  if (!r.ok) return [];
  const j = (await r.json().catch(() => ({}))) as {
    results?: Array<{
      trackId?: number;
      trackName?: string;
      artistName?: string;
      artworkUrl100?: string;
      previewUrl?: string;
      trackViewUrl?: string;
    }>;
  };
  const rows = Array.isArray(j.results) ? j.results : [];
  return rows
    .filter((x) => !!x.trackId && !!x.trackName)
    .map((x) => ({
      apple_song_id: String(x.trackId),
      title: x.trackName ?? "",
      artist: x.artistName ?? "",
      artwork_url: x.artworkUrl100 ?? null,
      preview_url: x.previewUrl ?? null,
      apple_music_url: x.trackViewUrl ?? null,
    }));
}

function readAppleMusicCredentials(): { teamId: string; keyId: string; pem: string } {
  const teamId = (Deno.env.get("APPLE_MUSIC_TEAM_ID") ?? "").trim();
  const keyId = (Deno.env.get("APPLE_MUSIC_KEY_ID") ?? "").trim();
  let pem = (Deno.env.get("APPLE_MUSIC_PRIVATE_KEY") ?? "").trim();
  const missing: string[] = [];
  if (!teamId) missing.push("APPLE_MUSIC_TEAM_ID");
  if (!keyId) missing.push("APPLE_MUSIC_KEY_ID");
  if (!pem) missing.push("APPLE_MUSIC_PRIVATE_KEY");
  if (missing.length) {
    throw new Error(
      `[Apple Music] Supabase → Edge Functions → Secrets에 다음이 없습니다: ${missing.join(", ")}. `
        + "Apple Developer → Keys에서 **Apple Music API**용으로 만든 키의 Team ID·Key ID·.p8 전체를 넣어 주세요. "
        + "(Sign in with Apple 전용 키 ID는 사용할 수 없습니다.)",
    );
  }
  pem = pem.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "[Apple Music] APPLE_MUSIC_PRIVATE_KEY 형식이 잘못되었습니다. .p8 파일 전체(BEGIN PRIVATE KEY~END)를 한 값으로 넣었는지 확인해 주세요.",
    );
  }
  return { teamId, keyId, pem };
}

async function getDeveloperToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) {
    return cachedToken.token;
  }

  const { teamId, keyId, pem } = readAppleMusicCredentials();

  let token: string;
  try {
    const key = await importPKCS8(pem, "ES256");
    token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + 60 * 24 * 60 * 60)
      .sign(key);
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      "[Apple Music] 개발자 토큰(JWT)을 만들지 못했습니다. "
        + "KEY_ID와 PRIVATE_KEY가 **같은 키**에서 나온 짝인지, Music API 권한이 있는 .p8인지 확인해 주세요. "
        + `(상세: ${hint.slice(0, 120)})`,
    );
  }

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
    // Search endpoint is safe to expose without user-bound writes.
    // Keep compatibility with existing auth flow, but don't hard-fail when token is absent/expired.
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      } catch {
        // ignore auth lookup failures for read-only search
      }
    }

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
      const fallback = await fallbackItunesSearch(term, storefront);
      if (fallback.length > 0) {
        return json({ tracks: fallback, source: "itunes_fallback" });
      }
      let userMsg = "Apple Music 검색에 실패했습니다.";
      if (res.status === 401 || res.status === 403) {
        userMsg =
          "[Apple Music] Apple이 개발자 토큰을 거부했습니다(401/403). "
            + "Supabase Secrets의 KEY_ID·PRIVATE_KEY가 같은 Music 키인지, 그 키에 Apple Music API가 붙어 있는지 확인해 주세요.";
      }
      return json(
        { error: userMsg, detail: t.slice(0, 200), status: res.status },
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
