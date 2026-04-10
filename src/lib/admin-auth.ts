import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 管理者認証チェック。
 * 認証済み + is_admin=true の場合のみ adminClient を返す。
 * 失敗時は Response を返す。
 */
export async function requireAdmin(): Promise<
  | { ok: true; adminClient: ReturnType<typeof createAdminClient> }
  | { ok: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "認証が必要です" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin auth: profile fetch error:", profileError);
    return {
      ok: false,
      response: Response.json({ error: "認証情報の取得に失敗しました" }, { status: 500 }),
    };
  }

  if (!profile?.is_admin) {
    return {
      ok: false,
      response: Response.json({ error: "管理者権限が必要です" }, { status: 403 }),
    };
  }

  return { ok: true, adminClient: createAdminClient() };
}
