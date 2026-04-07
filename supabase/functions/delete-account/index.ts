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

/**
 * Delete the public profile row for this user. Most child tables use
 * ON DELETE CASCADE from profiles(id). Old code used .eq("user_id") which
 * does not exist on profiles — so the profile (and auth user) were never cleaned up.
 */
async function deleteProfileCascade(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Explicit cleanup for tables that need OR filters (not only user_id)
  await supabase
    .from("friendships")
    .delete()
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  await supabase
    .from("user_blocks")
    .delete()
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  await supabase.from("content_reports").delete().eq("reporter_id", userId);
  await supabase
    .from("content_reports")
    .update({ reported_user_id: null })
    .eq("reported_user_id", userId);

  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "인증 토큰이 필요합니다." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json({ error: "인증 실패" }, 401);

    const userId = user.id;

    // 1) Preferred: remove auth user (CASCADE to profiles in DB)
    const { error: del1 } = await supabase.auth.admin.deleteUser(userId);
    if (!del1) {
      return json({ success: true });
    }

    console.warn("[delete-account] admin.deleteUser:", del1.message);

    // 2) Remove public data (correct profiles.id) then retry auth deletion
    const cleared = await deleteProfileCascade(supabase, userId);
    if (!cleared.ok) {
      console.error("[delete-account] profile cascade:", cleared.message);
      return json(
        {
          error: "계정 데이터를 삭제하지 못했습니다.",
          details: cleared.message,
        },
        500,
      );
    }

    const { error: del2 } = await supabase.auth.admin.deleteUser(userId);
    if (del2) {
      console.error("[delete-account] admin.deleteUser retry:", del2.message);
      return json(
        { error: "계정 삭제 중 오류가 발생했습니다.", details: del2.message },
        500,
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
