import holidayJp from "@holiday-jp/holiday_jp";

/**
 * 指定日の「実効曜日」を返す。
 * 日本の祝日は日曜（0）扱いにして、土日祝を同じ料金体系にする。
 */
export function getEffectiveDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  if (holidayJp.isHoliday(date)) {
    return 0; // 祝日 → 日曜扱い
  }
  return date.getDay();
}
