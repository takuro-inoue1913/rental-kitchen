import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildCancellationEmail } from "../email";

const baseParams = {
  guestName: "山田太郎",
  date: "2026-04-15",
  startTime: "10:00",
  endTime: "14:00",
  totalPrice: 11000,
  refundAmount: 11000,
  reservationId: "abc12345-6789",
  siteUrl: "https://example.com",
};

describe("buildCancellationEmail", () => {
  it("件名に【予約キャンセル】と日付が含まれる", () => {
    const { subject } = buildCancellationEmail(baseParams);
    expect(subject).toContain("【予約キャンセル】");
    expect(subject).toContain("2026年4月15日（水）");
    expect(subject).toContain("10:00〜14:00");
  });

  it("本文にゲスト名と予約情報が含まれる", () => {
    const { text } = buildCancellationEmail(baseParams);
    expect(text).toContain("山田太郎 様");
    expect(text).toContain("キャンセルされました");
    expect(text).toContain("2026年4月15日（水）");
    expect(text).toContain("10:00 〜 14:00");
    expect(text).toContain("¥11,000");
  });

  it("返金ありの場合は返金情報が含まれる", () => {
    const { text } = buildCancellationEmail(baseParams);
    expect(text).toContain("返金額: ¥11,000");
    expect(text).toContain("返金はお支払い方法に応じて");
  });

  it("返金なし（0円）の場合は返金セクションが含まれない", () => {
    const { text } = buildCancellationEmail({
      ...baseParams,
      refundAmount: 0,
    });
    expect(text).not.toContain("返金額");
    expect(text).not.toContain("返金はお支払い方法");
  });

  it("部分返金の場合は返金額が正しく表示される", () => {
    const { text } = buildCancellationEmail({
      ...baseParams,
      refundAmount: 5500,
    });
    expect(text).toContain("返金額: ¥5,500");
  });

  it("予約IDが含まれる", () => {
    const { text } = buildCancellationEmail(baseParams);
    expect(text).toContain("abc12345-6789");
  });

  it("マイページリンクが含まれる", () => {
    const { text } = buildCancellationEmail(baseParams);
    expect(text).toContain("https://example.com/my/reservations");
  });

  it("土日の日付が正しくフォーマットされる", () => {
    const { subject } = buildCancellationEmail({
      ...baseParams,
      date: "2026-04-12",
    });
    expect(subject).toContain("2026年4月12日（日）");
  });
});
