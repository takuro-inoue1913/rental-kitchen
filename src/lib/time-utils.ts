/**
 * "HH:MM" 形式の時刻を分に変換
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 分を "HH:MM" 形式に変換
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * ISO 8601 日時文字列から HH:MM を抽出
 */
export function extractTime(dateTimeStr: string): string {
  if (!dateTimeStr.includes("T")) return "00:00";
  const timePart = dateTimeStr.split("T")[1];
  return timePart.substring(0, 5);
}

/**
 * イベントの終了時刻を解決する。
 * 終了日時が開始日時と異なる日付の場合 "24:00" を返し、
 * 翌日にまたがる予約のブロック判定を正しく行えるようにする。
 */
export function resolveEndTime(startDt: string, endDt: string): string {
  if (!startDt.includes("T")) return "00:00";
  const startDate = startDt.split("T")[0];
  const endDate = endDt.split("T")[0];
  if (endDate > startDate) return "24:00";
  return extractTime(endDt);
}
