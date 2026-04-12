import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildConfirmationEmail } from "../email";

const baseParams = {
  guestName: "山田太郎",
  date: "2026-04-15",
  startTime: "10:00",
  endTime: "14:00",
  totalPrice: 14000,
  options: [] as { name: string; quantity: number; price: number }[],
  reservationId: "test-reservation-id",
  siteUrl: "https://example.com",
};

describe("buildConfirmationEmail", () => {
  it("件名に日付・時間・サイト名を含む", () => {
    const { subject } = buildConfirmationEmail(baseParams);
    expect(subject).toBe(
      "【予約確定】2026年4月15日（水） 10:00〜14:00 - レンタルキッチン神田",
    );
  });

  it("本文にゲスト名を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("山田太郎 様");
  });

  it("本文にフォーマット済み日付を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("2026年4月15日（水）");
  });

  it("本文に時間を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("10:00 〜 14:00");
  });

  it("本文に合計金額を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("¥14,000（税込）");
  });

  it("本文に予約IDを含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("予約ID: test-reservation-id");
  });

  it("本文にキャンセルポリシーを含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("7日前まで: 全額返金");
    expect(text).toContain("当日: 返金なし");
  });

  it("本文にマイページリンクを含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("https://example.com/my/reservations");
  });

  it("本文にアクセス情報を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("千代田区内神田");
    expect(text).toContain("神田駅");
  });

  it("オプションなしの場合はオプションセクションがない", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).not.toContain("■ オプション");
  });

  it("オプションありの場合はオプション名・数量・料金を含む", () => {
    const { text } = buildConfirmationEmail({
      ...baseParams,
      options: [
        { name: "清掃サービス", quantity: 1, price: 3000 },
        { name: "プロジェクター", quantity: 2, price: 1000 },
      ],
    });
    expect(text).toContain("■ オプション");
    expect(text).toContain("清掃サービス ×1  ¥3,000");
    expect(text).toContain("プロジェクター ×2  ¥1,000");
  });

  it("本文に消費税内訳を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    // ¥14,000 → 税抜 ¥12,727 + 消費税 ¥1,273
    expect(text).toContain("税抜");
    expect(text).toContain("消費税");
    expect(text).toContain("¥12,727");
    expect(text).toContain("¥1,273");
  });

  it("本文にお問い合わせ先を含む", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).toContain("お問い合わせ:");
  });

  it("法人予約の場合は会社名が含まれる", () => {
    const { text } = buildConfirmationEmail({
      ...baseParams,
      companyName: "株式会社テスト",
    });
    expect(text).toContain("会社名: 株式会社テスト");
  });

  it("個人予約の場合は会社名行がない", () => {
    const { text } = buildConfirmationEmail(baseParams);
    expect(text).not.toContain("会社名:");
  });

  it("日曜日の日付フォーマットが正しい", () => {
    const { subject } = buildConfirmationEmail({
      ...baseParams,
      date: "2026-04-12", // 日曜日
    });
    expect(subject).toContain("2026年4月12日（日）");
  });
});
