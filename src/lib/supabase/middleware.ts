import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function createRedirectResponse(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (pathname === "/auth/login") {
    url.searchParams.set(
      "redirect",
      request.nextUrl.pathname + request.nextUrl.search
    );
  }
  const redirectResponse = NextResponse.redirect(url);
  // Cookie 更新をリダイレクトレスポンスに引き継ぐ
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

/** アクセスコードゲートの対象外パス */
const GATE_BYPASS_PREFIXES = [
  "/gate",
  "/api/gate",
  "/api/stripe/webhook",
  "/api/cron/",
];

export async function updateSession(request: NextRequest) {
  // アクセスコードゲート（SITE_ACCESS_CODE が設定されている場合のみ有効）
  const accessCode = process.env.SITE_ACCESS_CODE;
  if (accessCode) {
    const pathname = request.nextUrl.pathname;
    const isBypassed = GATE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));

    if (!isBypassed && !request.cookies.get("site_access")) {
      const url = request.nextUrl.clone();
      url.pathname = "/gate";
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションの更新（重要：getUser を呼ぶことでトークンリフレッシュが行われる）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 管理画面へのアクセス制御
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return createRedirectResponse(request, supabaseResponse, "/auth/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return createRedirectResponse(request, supabaseResponse, "/");
    }
  }

  // マイページへのアクセス制御
  if (request.nextUrl.pathname.startsWith("/my")) {
    if (!user) {
      return createRedirectResponse(request, supabaseResponse, "/auth/login");
    }
  }

  return supabaseResponse;
}
