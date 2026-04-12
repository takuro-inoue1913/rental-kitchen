import { NextRequest } from "next/server";
import {
  GATE_COOKIE_NAME,
  GATE_COOKIE_MAX_AGE,
  hashAccessCode,
} from "@/lib/access-gate";

/**
 * POST /api/gate
 * アクセスコードを検証し、正しければ Cookie をセットする。
 * Cookie の値はコードのハッシュとし、コード変更時に古い Cookie を無効化する。
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const expected = process.env.SITE_ACCESS_CODE;
  if (!expected) {
    return Response.json({ error: "ゲートが設定されていません" }, { status: 500 });
  }

  const code = (body as { code?: unknown })?.code;
  if (typeof code !== "string" || code !== expected) {
    return Response.json({ error: "アクセスコードが正しくありません" }, { status: 401 });
  }

  const hash = hashAccessCode(expected);
  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${GATE_COOKIE_NAME}=${hash}; Path=/; Max-Age=${GATE_COOKIE_MAX_AGE}; SameSite=Lax`,
  );
  return response;
}
