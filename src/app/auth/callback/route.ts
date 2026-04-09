import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // オープンリダイレクト対策: "/" 始まりの相対パスのみ許可
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const url = request.nextUrl.clone();
      url.pathname = next;
      url.searchParams.delete("code");
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("error", "callback_failed");
  return NextResponse.redirect(url);
}
