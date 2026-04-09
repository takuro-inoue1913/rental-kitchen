import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const { password } = await request.json();

  if (!password || password.length < 6) {
    return Response.json(
      { error: "パスワードは6文字以上で入力してください" },
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

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return Response.json(
      { error: "パスワードの変更に失敗しました" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
