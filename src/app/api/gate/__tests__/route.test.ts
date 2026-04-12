import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GATE_COOKIE_NAME, GATE_COOKIE_MAX_AGE } from "@/lib/access-gate";

function makeRequest(body?: unknown) {
  if (body === undefined) {
    // 不正な JSON をシミュレート
    return new NextRequest("http://localhost/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });
  }
  return new NextRequest("http://localhost/api/gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("SITE_ACCESS_CODE", "test-code");
});

describe("POST /api/gate", () => {
  it("不正な JSON の場合 400 を返す", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("リクエストボディが不正です");
  });

  it("SITE_ACCESS_CODE が未設定の場合 500 を返す", async () => {
    vi.stubEnv("SITE_ACCESS_CODE", "");
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: "any" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("ゲートが設定されていません");
  });

  it("code が文字列でない場合 401 を返す", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: 12345 }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("アクセスコードが正しくありません");
  });

  it("code が不一致の場合 401 を返す", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: "wrong-code" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("アクセスコードが正しくありません");
  });

  it("正しいコードの場合 Set-Cookie ヘッダー付きで 200 を返す", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: "test-code" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const setCookie = res.headers.get("Set-Cookie")!;
    expect(setCookie).toContain(`${GATE_COOKIE_NAME}=`);
    expect(setCookie).toContain(`Max-Age=${GATE_COOKIE_MAX_AGE}`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("本番環境では Secure 属性が付与される", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: "test-code" }));
    const setCookie = res.headers.get("Set-Cookie")!;
    expect(setCookie).toContain("Secure");
  });

  it("開発環境では Secure 属性が付与されない", async () => {
    vi.stubEnv("NODE_ENV", "development");
    // VERCEL 環境変数が存在しないことを確認
    delete process.env.VERCEL;
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ code: "test-code" }));
    const setCookie = res.headers.get("Set-Cookie")!;
    expect(setCookie).not.toContain("Secure");
  });
});
