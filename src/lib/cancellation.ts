import { TIMEZONE } from "@/lib/constants";

export type CancellationPolicy = {
  refundPercent: number;
  refundAmount: number;
  cancellationFee: number;
  label: string;
};

/**
 * Asia/Tokyo の「今日」の 0:00 から予約日の 0:00 までの暦日数を返す。
 * 当日 → 0、過去 → 負数。
 */
export function daysUntilReservation(
  reservationDate: string,
  now?: Date,
): number {
  const current = now ?? new Date();
  // Asia/Tokyo の日付文字列を取得して比較
  const todayStr = current.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const reservationMs = new Date(reservationDate + "T00:00:00").getTime();
  return Math.round((reservationMs - todayMs) / (1000 * 60 * 60 * 24));
}

/**
 * キャンセルポリシーに基づいて返金額を算出する。
 *
 * - 7日前まで: 全額返金 (100%)
 * - 3〜6日前: 50%返金
 * - 2日前〜前日: 20%返金
 * - 当日・過去: 返金なし (0%)
 */
export function calculateRefund(
  reservationDate: string,
  totalPrice: number,
  now?: Date,
): CancellationPolicy {
  const days = daysUntilReservation(reservationDate, now);

  let refundPercent: number;
  let label: string;

  if (days >= 7) {
    refundPercent = 100;
    label = "全額返金";
  } else if (days >= 3) {
    refundPercent = 50;
    label = "利用料金の50%を返金";
  } else if (days >= 1) {
    refundPercent = 20;
    label = "利用料金の20%を返金";
  } else {
    refundPercent = 0;
    label = "返金なし";
  }

  const refundAmount = Math.floor(totalPrice * (refundPercent / 100));
  const cancellationFee = totalPrice - refundAmount;

  return { refundPercent, refundAmount, cancellationFee, label };
}

/**
 * ユーザーがキャンセル可能かどうかを判定する。
 * confirmed かつ未来の予約（当日含む）が対象。
 */
export function isCancellable(
  status: string,
  reservationDate: string,
  now?: Date,
): boolean {
  if (status !== "confirmed") return false;
  return daysUntilReservation(reservationDate, now) >= 0;
}
