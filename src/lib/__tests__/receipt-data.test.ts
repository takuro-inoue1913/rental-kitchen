import { describe, it, expect, vi } from "vitest";

// buildInvoiceData は DB 依存のため、UUID バリデーションのみユニットテスト。
// DB アクセスをモックして所有権チェック・ステータスチェックもテストする。

// Supabase admin client のモック
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// server-only をモック
vi.mock("server-only", () => ({}));

const { buildInvoiceData } = await import("../receipt-data");

describe("buildInvoiceData", () => {
  it("不正なUUID形式を拒否する", async () => {
    const result = await buildInvoiceData("not-a-uuid");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("不正な予約ID");
    }
  });

  it("空文字を拒否する", async () => {
    const result = await buildInvoiceData("");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(400);
    }
  });

  it("SQLインジェクション的な文字列を拒否する", async () => {
    const result = await buildInvoiceData("'; DROP TABLE reservations;--");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(400);
    }
  });

  it("正しいUUID形式は受け付ける（DB依存部分は別途検証）", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await buildInvoiceData("12345678-1234-1234-1234-123456789abc");
    // DB からデータが見つからない場合は 404
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(404);
    }
  });

  it("userId 指定時に所有者不一致で403を返す", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "12345678-1234-1234-1234-123456789abc",
        user_id: "owner-user-id",
        status: "confirmed",
        date: "2026-04-15",
        start_time: "10:00:00",
        end_time: "15:00:00",
        guest_name: "テスト",
        billing_type: "individual",
        company_name: null,
        company_department: null,
        usage_purpose: null,
        base_price: 11000,
        total_price: 11000,
      },
      error: null,
    });

    const result = await buildInvoiceData(
      "12345678-1234-1234-1234-123456789abc",
      "different-user-id"
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("権限");
    }
  });

  it("pending ステータスの予約を拒否する", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "12345678-1234-1234-1234-123456789abc",
        user_id: "user-id",
        status: "pending",
        date: "2026-04-15",
        start_time: "10:00:00",
        end_time: "15:00:00",
        guest_name: "テスト",
        billing_type: "individual",
        company_name: null,
        company_department: null,
        usage_purpose: null,
        base_price: 11000,
        total_price: 11000,
      },
      error: null,
    });

    const result = await buildInvoiceData(
      "12345678-1234-1234-1234-123456789abc",
      "user-id"
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("確定済み");
    }
  });
});
