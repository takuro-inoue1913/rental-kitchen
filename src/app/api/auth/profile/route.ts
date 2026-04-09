import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const { fullName, phone } = await request.json();

  if (!fullName) {
    return Response.json(
      { error: "お名前は必須です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);

  if (error) {
    return Response.json(
      { error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
