import { NextRequest } from "next/server";

const COOKIE_NAME = "site_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30日

/**
 * POST /api/gate
 * アクセスコードを検証し、正しければ Cookie をセットする。
 */
export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const expected = process.env.SITE_ACCESS_CODE;

  if (!expected) {
    return Response.json({ error: "ゲートが設定されていません" }, { status: 500 });
  }

  if (!code || code !== expected) {
    return Response.json({ error: "アクセスコードが正しくありません" }, { status: 401 });
  }

  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=verified; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`,
  );
  return response;
}
