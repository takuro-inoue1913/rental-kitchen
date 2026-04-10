import { TIMEZONE } from "@/lib/constants";

export type CancellationPolicy = {
  refundPercent: number;
  refundAmount: number;
  cancellationFee: number;
  label: string;
};

/**
 * Asia/Tokyo の「今日」から予約日までの暦日数を返す。
 * 当日 → 0、過去 → 負数。
 * タイムゾーン非依存: 年月日を数値化して差分を取るため DST の影響を受けない。
 */
export function daysUntilReservation(
  reservationDate: string,
  now?: Date,
): number {
  const current = now ?? new Date();
  // Asia/Tokyo の日付文字列を取得
  const todayStr = current.toLocaleDateString("sv-SE", { timeZone: TIMEZONE });
  // YYYY-MM-DD を数値パースして日数差を計算（TZ 非依存）
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [ry, rm, rd] = reservationDate.split("-").map(Number);
  const todayDays = Date.UTC(ty, tm - 1, td) / (1000 * 60 * 60 * 24);
  const reservationDays = Date.UTC(ry, rm - 1, rd) / (1000 * 60 * 60 * 24);
  return reservationDays - todayDays;
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
