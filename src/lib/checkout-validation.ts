import { timeToMinutes } from "./time-utils";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export type CheckoutBody = {
  date: string;
  startTime: string;
  endTime: string;
  optionIds: string[];
  guestEmail: string;
  guestName: string;
};

export function parseCheckoutBody(
  raw: unknown
): { data: CheckoutBody } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "リクエストボディが不正です" };
  }
  const b = raw as Record<string, unknown>;

  if (!isNonEmptyString(b.date) || !DATE_RE.test(b.date)) {
    return { error: "date は YYYY-MM-DD 形式で必須です" };
  }
  if (!isNonEmptyString(b.startTime) || !TIME_RE.test(b.startTime)) {
    return { error: "startTime は HH:MM 形式で必須です" };
  }
  if (!isNonEmptyString(b.endTime) || !TIME_RE.test(b.endTime)) {
    return { error: "endTime は HH:MM 形式で必須です" };
  }
  if (!isNonEmptyString(b.guestEmail)) {
    return { error: "guestEmail は必須です" };
  }
  if (!isNonEmptyString(b.guestName)) {
    return { error: "guestName は必須です" };
  }

  const optionIds = b.optionIds ?? [];
  if (
    !Array.isArray(optionIds) ||
    !optionIds.every((id) => typeof id === "string")
  ) {
    return { error: "optionIds は文字列配列である必要があります" };
  }

  const startMin = timeToMinutes(b.startTime);
  const endMin = timeToMinutes(b.endTime);
  if (endMin <= startMin) {
    return { error: "endTime は startTime より後である必要があります" };
  }

  return {
    data: {
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      optionIds: optionIds as string[],
      guestEmail: b.guestEmail,
      guestName: b.guestName,
    },
  };
}

/**
 * 選択されたスロットが連続しているか判定
 */
export function areSlotsContiguous(
  slots: { startTime: string; endTime: string }[]
): boolean {
  if (slots.length <= 1) return true;
  const sorted = [...slots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime !== sorted[i - 1].endTime) {
      return false;
    }
  }
  return true;
}

/**
 * 連続範囲の数をカウント
 */
export function countRanges(
  slots: { startTime: string; endTime: string }[]
): number {
  if (slots.length === 0) return 0;
  const sorted = [...slots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime !== sorted[i - 1].endTime) {
      count++;
    }
  }
  return count;
}
