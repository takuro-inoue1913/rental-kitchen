import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { email, password, fullName, phone } = await request.json();

  if (!email || !password || !fullName) {
    return Response.json(
      { error: "メールアドレス、パスワード、お名前は必須です" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return Response.json(
      { error: "パスワードは6文字以上で入力してください" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return Response.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }
    return Response.json(
      { error: `登録に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  // handle_new_user trigger は phone を保存しないため admin client で更新
  if (phone && data.user) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ phone })
      .eq("id", data.user.id);
  }

  // メール確認が必要な場合
  const needsConfirmation =
    data.user && data.user.identities?.length === 0;

  return Response.json({
    success: true,
    needsConfirmation: !!needsConfirmation,
  });
}
