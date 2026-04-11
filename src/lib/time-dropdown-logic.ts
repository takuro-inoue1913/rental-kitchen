import type { TimeSlot } from "@/lib/availability";

export type Range = { start: string; end: string; hours: number };

export function parseTime(time: string): { hour: string; minute: string } {
  const [h, m] = time.split(":");
  return { hour: h, minute: m ?? "00" };
}

export function formatTime(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/**
 * 選択済みスロットを連続した範囲にグループ化する。
 */
export function getRanges(selectedSlots: TimeSlot[]): Range[] {
  if (selectedSlots.length === 0) return [];
  const sorted = [...selectedSlots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const ranges: Range[] = [];
  let start = sorted[0].startTime;
  let end = sorted[0].endTime;
  let hours = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime === end) {
      end = sorted[i].endTime;
      hours++;
    } else {
      ranges.push({ start, end, hours });
      start = sorted[i].startTime;
      end = sorted[i].endTime;
      hours = 1;
    }
  }
  ranges.push({ start, end, hours });
  return ranges;
}

/**
 * 開始時間の選択肢を算出する。
 * 空き枠のうち、確定済み範囲で使用されていない枠の startTime を返す。
 */
export function getStartOptions(
  slots: TimeSlot[],
  occupiedSet: Set<string>,
): string[] {
  return slots
    .filter((s) => s.available && !occupiedSet.has(s.startTime))
    .map((s) => s.startTime);
}

/**
 * 終了時間の選択肢を算出する。
 * 開始時間から連続する空き枠の endTime を返す。
 * 予約済み or 確定済み範囲の枠に当たったら止める。
 */
export function getEndOptions(
  slots: TimeSlot[],
  currentStart: string,
  occupiedSet: Set<string>,
): string[] {
  if (!currentStart) return [];
  const startIdx = slots.findIndex((s) => s.startTime === currentStart);
  if (startIdx === -1) return [];

  const ends: string[] = [];
  for (let i = startIdx; i < slots.length; i++) {
    if (!slots[i].available || occupiedSet.has(slots[i].startTime)) {
      break;
    }
    ends.push(slots[i].endTime);
  }
  return ends;
}

/**
 * 範囲一覧から合計時間（時間単位）を算出する。
 */
export function calcTotalHours(ranges: Range[]): number {
  const totalMinutes = ranges.reduce((sum, r) => {
    const [sh, sm] = r.start.split(":").map(Number);
    const [eh, em] = r.end.split(":").map(Number);
    return sum + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);
  return totalMinutes / 60;
}
