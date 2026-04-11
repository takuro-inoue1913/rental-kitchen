import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChainMock(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(resolveValue));
  return chain;
}

// 2 段階の Supabase 呼び出しに対応するモック（select → update）
function createTwoStepChainMock(
  selectResult: { data: unknown; error: unknown },
  updateResult: { data: unknown; error: unknown },
) {
  let callCount = 0;
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => {
    callCount++;
    return Promise.resolve(callCount === 1 ? selectResult : updateResult);
  });
  return chain;
}

// --- モジュールモック ---
const mockAdminClient = createChainMock({ data: null, error: null });

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn(),
    },
  },
}));

// cancellation はそのまま使う（純粋関数）
vi.mock("@/lib/cancellation", async () => {
  const actual = await vi.importActual("@/lib/cancellation");
  return actual;
});

import { POST } from "../route";
import { requireAdmin } from "@/lib/admin-auth";
import { stripe } from "@/lib/stripe";

const mockedRequireAdmin = vi.mocked(requireAdmin);
const mockedStripeRefundsCreate = vi.mocked(stripe.refunds.create);

function makeRequest() {
  return {} as unknown as Parameters<typeof POST>[0];
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** 7 日後の日付文字列を返す */
function futureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/reservations/[id]/cancel", () => {
  it("管理者でない場合 401 を返す", async () => {
    mockedRequireAdmin.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "認証が必要です" }, { status: 401 }),
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(401);
  });

  it("予約が見つからない場合 404 を返す", async () => {
    const chain = createChainMock({ data: null, error: { message: "not found" } });
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("予約が見つかりません");
  });

  it("キャンセル不可の予約（cancelled）で 400 を返す", async () => {
    const chain = createChainMock({
      data: {
        id: "uuid-1",
        user_id: "user-1",
        date: futureDate(),
        status: "cancelled",
        total_price: 11000,
        stripe_payment_intent_id: "pi_test",
      },
      error: null,
    });
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("この予約はキャンセルできません");
  });

  it("キャンセル不可の予約（過去日）で 400 を返す", async () => {
    const chain = createChainMock({
      data: {
        id: "uuid-1",
        user_id: "user-1",
        date: "2020-01-01",
        status: "confirmed",
        total_price: 11000,
        stripe_payment_intent_id: "pi_test",
      },
      error: null,
    });
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(400);
  });

  it("二重キャンセル（update 失敗）で 409 を返す", async () => {
    const chain = createTwoStepChainMock(
      {
        data: {
          id: "uuid-1",
          user_id: "user-1",
          date: futureDate(),
          status: "confirmed",
          total_price: 11000,
          stripe_payment_intent_id: "pi_test",
        },
        error: null,
      },
      { data: null, error: { message: "conflict" } },
    );
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("既にキャンセル");
  });

  it("正常にキャンセル → Stripe 返金 → 200 を返す", async () => {
    const date = futureDate(); // 7日後 → 100% 返金
    const chain = createTwoStepChainMock(
      {
        data: {
          id: "uuid-1",
          user_id: "user-1",
          date,
          status: "confirmed",
          total_price: 11000,
          stripe_payment_intent_id: "pi_test",
        },
        error: null,
      },
      { data: { id: "uuid-1" }, error: null },
    );
    // refund_amount 更新用の 3 回目の呼び出し
    const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
    updateChain.from = vi.fn(() => updateChain);
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    // 3 回目以降の from 呼び出しを updateChain に切り替え
    let fromCallCount = 0;
    chain.from = vi.fn(() => {
      fromCallCount++;
      if (fromCallCount <= 2) return chain;
      return updateChain;
    });

    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });
    mockedStripeRefundsCreate.mockResolvedValue({} as never);

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.refundPercent).toBe(100);
    expect(body.refundAmount).toBe(11000);
    expect(body.cancellationFee).toBe(0);
    expect(body.warning).toBeUndefined();

    expect(mockedStripeRefundsCreate).toHaveBeenCalledWith({
      payment_intent: "pi_test",
      amount: 11000,
    });
  });

  it("Stripe 返金失敗時は warning 付きで 200 を返す", async () => {
    const date = futureDate();
    const chain = createTwoStepChainMock(
      {
        data: {
          id: "uuid-1",
          user_id: "user-1",
          date,
          status: "confirmed",
          total_price: 11000,
          stripe_payment_intent_id: "pi_test",
        },
        error: null,
      },
      { data: { id: "uuid-1" }, error: null },
    );
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });
    mockedStripeRefundsCreate.mockRejectedValue(new Error("Stripe error"));

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.warning).toContain("返金処理に失敗");
  });

  it("payment_intent_id がない場合は Stripe を呼ばない", async () => {
    const date = futureDate();
    const chain = createTwoStepChainMock(
      {
        data: {
          id: "uuid-1",
          user_id: "user-1",
          date,
          status: "confirmed",
          total_price: 11000,
          stripe_payment_intent_id: null,
        },
        error: null,
      },
      { data: { id: "uuid-1" }, error: null },
    );
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockedStripeRefundsCreate).not.toHaveBeenCalled();
  });

  it("当日キャンセル（返金額 0）の場合は Stripe を呼ばない", async () => {
    // 当日の日付を取得
    const now = new Date();
    const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

    const chain = createTwoStepChainMock(
      {
        data: {
          id: "uuid-1",
          user_id: "user-1",
          date: todayStr,
          status: "confirmed",
          total_price: 11000,
          stripe_payment_intent_id: "pi_test",
        },
        error: null,
      },
      { data: { id: "uuid-1" }, error: null },
    );
    mockedRequireAdmin.mockResolvedValue({
      ok: true as const,
      adminClient: chain as never,
    });

    const res = await POST(makeRequest(), makeParams("uuid-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.refundPercent).toBe(0);
    expect(body.refundAmount).toBe(0);
    expect(mockedStripeRefundsCreate).not.toHaveBeenCalled();
  });
});
