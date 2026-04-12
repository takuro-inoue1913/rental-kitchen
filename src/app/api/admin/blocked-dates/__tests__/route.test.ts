import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Supabase チェーンモック ---
function createChainMock(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(resolveValue));
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolveValue));
  chain.single = vi.fn(() => Promise.resolve(resolveValue));
  return chain;
}

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: vi.fn(),
}));

import { GET, POST, DELETE } from "../route";
import { requireAdmin } from "@/lib/admin-auth";

const mockedRequireAdmin = vi.mocked(requireAdmin);

function mockAdmin(chain: ReturnType<typeof createChainMock>) {
  mockedRequireAdmin.mockResolvedValue({
    ok: true,
    adminClient: chain as never,
    response: undefined as never,
  });
}

function mockUnauthorized() {
  mockedRequireAdmin.mockResolvedValue({
    ok: false,
    response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    adminClient: undefined as never,
  });
}

function makeRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>,
) {
  const url = new URL("http://localhost/api/admin/blocked-dates");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/blocked-dates", () => {
  it("認証エラーで 401 を返す", async () => {
    mockUnauthorized();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("休業日一覧を返す", async () => {
    const dates = [
      { id: "1", date: "2026-05-01", reason: "GW", created_at: "" },
    ];
    const chain = createChainMock({ data: dates, error: null });
    mockAdmin(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked_dates).toEqual(dates);
  });
});

describe("POST /api/admin/blocked-dates", () => {
  it("認証エラーで 401 を返す", async () => {
    mockUnauthorized();
    const req = makeRequest("POST", { date: "2026-05-01" });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("不正な日付形式で 400 を返す", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockAdmin(chain);
    const req = makeRequest("POST", { date: "invalid" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("存在しない日付で 400 を返す", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockAdmin(chain);
    const req = makeRequest("POST", { date: "2026-02-31" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("存在しない日付");
  });

  it("重複する日付で 409 を返す", async () => {
    const chain = createChainMock({ data: { id: "existing" }, error: null });
    mockAdmin(chain);
    const req = makeRequest("POST", { date: "2026-05-01" });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });

  it("正常に追加して 201 を返す", async () => {
    const newItem = {
      id: "new-id",
      date: "2026-05-01",
      reason: null,
      created_at: "",
    };
    // maybeSingle で null（重複なし）→ single で新規レコード
    let callCount = 0;
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    chain.single = vi.fn(() => {
      callCount++;
      return Promise.resolve({ data: newItem, error: null });
    });
    mockAdmin(chain);

    const req = makeRequest("POST", { date: "2026-05-01" });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.blocked_date).toEqual(newItem);
  });

  it("一意制約違反で 409 を返す", async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    chain.single = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { code: "23505", message: "duplicate" },
      }),
    );
    mockAdmin(chain);

    const req = makeRequest("POST", { date: "2026-05-01" });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/admin/blocked-dates", () => {
  it("認証エラーで 401 を返す", async () => {
    mockUnauthorized();
    const req = makeRequest("DELETE", undefined, { id: "xxx" });
    const res = await DELETE(req as never);
    expect(res.status).toBe(401);
  });

  it("id 未指定で 400 を返す", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockAdmin(chain);
    const req = makeRequest("DELETE");
    const res = await DELETE(req as never);
    expect(res.status).toBe(400);
  });

  it("正常に削除して success を返す", async () => {
    const chain = createChainMock({ data: null, error: null });
    // delete → eq はエラーなしで resolve
    chain.eq = vi.fn(() => Promise.resolve({ error: null }));
    mockAdmin(chain);
    const req = makeRequest("DELETE", undefined, { id: "xxx" });
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
