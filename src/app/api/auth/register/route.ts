import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; fullName?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
  const { email, password, fullName, phone } = body;

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

  // admin client でメール確認済みユーザーを作成（確認メール不要）
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      return Response.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }
    if (error.message.includes("rate limit")) {
      return Response.json(
        { error: "短時間に多くのリクエストがありました。しばらく待ってから再度お試しください" },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "登録に失敗しました。もう一度お試しください" },
      { status: 500 }
    );
  }

  // phone を profiles に保存
  if (phone && data.user) {
    const { error: phoneError } = await admin
      .from("profiles")
      .update({ phone })
      .eq("id", data.user.id);
    if (phoneError) {
      console.error("Profile phone update failed:", phoneError);
    }
  }

  // 作成後にログインしてセッション Cookie をセット
  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return Response.json(
      { error: "登録は完了しましたが、自動ログインに失敗しました。ログインページからログインしてください" },
      { status: 200 }
    );
  }

  return Response.json({ success: true });
}
