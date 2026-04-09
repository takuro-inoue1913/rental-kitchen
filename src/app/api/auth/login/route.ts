import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }
  const { email, password } = body;

  if (!email || !password) {
    return Response.json(
      { error: "メールアドレスとパスワードは必須です" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return Response.json(
      { error: "メールアドレスまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  return Response.json({ success: true });
}
