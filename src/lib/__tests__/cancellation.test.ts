import { describe, it, expect } from "vitest";
import {
  daysUntilReservation,
  calculateRefund,
  isCancellable,
} from "../cancellation";

/**
 * テスト用ヘルパー: Asia/Tokyo の「今日」から指定日数後の日付文字列を返す。
 */
function dateAfterDays(days: number, now: Date): string {
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const d = new Date(todayStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  // toISOString() は UTC で返すため、ローカル日付部品を使う
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("daysUntilReservation", () => {
  const now = new Date("2026-04-10T10:00:00+09:00");

  it("当日 → 0", () => {
    expect(daysUntilReservation("2026-04-10", now)).toBe(0);
  });

  it("1日後 → 1", () => {
    expect(daysUntilReservation("2026-04-11", now)).toBe(1);
  });

  it("7日後 → 7", () => {
    expect(daysUntilReservation("2026-04-17", now)).toBe(7);
  });

  it("過去日 → 負数", () => {
    expect(daysUntilReservation("2026-04-09", now)).toBe(-1);
  });
});

describe("calculateRefund", () => {
  const totalPrice = 11000;
  const now = new Date("2026-04-10T10:00:00+09:00");

  it("7日前まで → 全額返金 (100%)", () => {
    const date = dateAfterDays(7, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(100);
    expect(result.refundAmount).toBe(11000);
    expect(result.cancellationFee).toBe(0);
  });

  it("10日前 → 全額返金 (100%)", () => {
    const date = dateAfterDays(10, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(100);
  });

  it("6日前 → 50%返金", () => {
    const date = dateAfterDays(6, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(5500);
    expect(result.cancellationFee).toBe(5500);
  });

  it("3日前 → 50%返金", () => {
    const date = dateAfterDays(3, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(50);
  });

  it("2日前 → 20%返金", () => {
    const date = dateAfterDays(2, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(20);
    expect(result.refundAmount).toBe(2200);
    expect(result.cancellationFee).toBe(8800);
  });

  it("前日 → 20%返金", () => {
    const date = dateAfterDays(1, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(20);
  });

  it("当日 → 返金なし (0%)", () => {
    const date = dateAfterDays(0, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(0);
    expect(result.refundAmount).toBe(0);
    expect(result.cancellationFee).toBe(11000);
  });

  it("過去日 → 返金なし (0%)", () => {
    const date = dateAfterDays(-1, now);
    const result = calculateRefund(date, totalPrice, now);
    expect(result.refundPercent).toBe(0);
  });

  it("端数は切り捨て", () => {
    const result = calculateRefund("2026-04-16", 11111, now); // 6日後, 50%
    expect(result.refundAmount).toBe(5555);
    expect(result.cancellationFee).toBe(5556);
  });
});

describe("isCancellable", () => {
  const now = new Date("2026-04-10T10:00:00+09:00");
  const futureDate = "2026-04-17";
  const pastDate = "2026-04-09";

  it("confirmed + 未来日 → true", () => {
    expect(isCancellable("confirmed", futureDate, now)).toBe(true);
  });

  it("confirmed + 当日 → true", () => {
    expect(isCancellable("confirmed", "2026-04-10", now)).toBe(true);
  });

  it("confirmed + 過去日 → false", () => {
    expect(isCancellable("confirmed", pastDate, now)).toBe(false);
  });

  it("pending → false", () => {
    expect(isCancellable("pending", futureDate, now)).toBe(false);
  });

  it("cancelled → false", () => {
    expect(isCancellable("cancelled", futureDate, now)).toBe(false);
  });

  it("completed → false", () => {
    expect(isCancellable("completed", futureDate, now)).toBe(false);
  });
});
