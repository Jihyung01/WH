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

    // Delete user data from all tables (order matters for FK constraints)
    const tables = [
      "chat_messages",
      "journal_entries",
      "event_completions",
      "mission_completions",
      "friend_locations",
      "friend_requests",
      "crew_members",
      "notifications",
      "characters",
      "profiles",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) {
        console.warn(`Failed to delete from ${table}: ${error.message}`);
      }
    }

    // Also delete where the user might be referenced as target
    await supabase.from("friend_requests").delete().eq("target_id", userId);

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      return json({ error: "계정 삭제 중 오류가 발생했습니다." }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
