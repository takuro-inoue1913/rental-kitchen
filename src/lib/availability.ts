import { timeToMinutes, minutesToTime } from "@/lib/time-utils";
import type { PricingType } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type AvailabilityRule =
  Database["public"]["Tables"]["availability_rules"]["Row"];

export type TimeSlot = {
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
};

export type TimeBlock = {
  startTime: string;
  endTime: string;
  price: number;
};

export type AvailabilityResponse = {
  date: string;
  pricingType: PricingType;
  dailyPrice: number | null;
  slots: TimeSlot[];
  blocks: TimeBlock[];
};

type CalendarEvent = {
  summary: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
};

/**
 * 営業ルールとカレンダーイベントから、指定日のスロット・ブロックを生成する。
 */
export function generateAvailability(
  dateStr: string,
  rule: AvailabilityRule,
  calendarEvents: CalendarEvent[],
): AvailabilityResponse {
  const pricingType = rule.pricing_type as PricingType;

  const bookedRanges = calendarEvents
    .filter((e) => !e.isAllDay)
    .map((e) => ({ start: e.startTime, end: e.endTime }));

  const hasAllDayEvent = calendarEvents.some((e) => e.isAllDay);

  // 時間枠を生成
  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(rule.start_time);
  const endMinutes = timeToMinutes(rule.end_time);
  const duration = rule.slot_duration_minutes;

  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const slotStart = minutesToTime(m);
    const slotEnd = minutesToTime(m + duration);

    const isBooked =
      hasAllDayEvent ||
      bookedRanges.some(
        (r) =>
          timeToMinutes(r.start) < m + duration && timeToMinutes(r.end) > m,
      );

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      price: pricingType === "daily" ? 0 : rule.price_per_slot,
      available: !isBooked,
    });
  }

  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // daily の場合: 連続する空き枠をブロックにまとめる
  const blocks: TimeBlock[] = [];
  if (pricingType === "daily") {
    let blockStart: string | null = null;
    let blockEnd: string | null = null;

    for (const slot of slots) {
      if (slot.available) {
        if (blockStart === null) blockStart = slot.startTime;
        blockEnd = slot.endTime;
      } else {
        if (blockStart !== null && blockEnd !== null) {
          blocks.push({
            startTime: blockStart,
            endTime: blockEnd,
            price: rule.price_per_slot,
          });
          blockStart = null;
          blockEnd = null;
        }
      }
    }
    if (blockStart !== null && blockEnd !== null) {
      blocks.push({
        startTime: blockStart,
        endTime: blockEnd,
        price: rule.price_per_slot,
      });
    }
  }

  return {
    date: dateStr,
    pricingType,
    dailyPrice: pricingType === "daily" ? rule.price_per_slot : null,
    slots,
    blocks,
  };
}

const EMPTY_RESPONSE: Omit<AvailabilityResponse, "date"> = {
  pricingType: "hourly",
  dailyPrice: null,
  slots: [],
  blocks: [],
};

export function emptyAvailability(dateStr: string): AvailabilityResponse {
  return { date: dateStr, ...EMPTY_RESPONSE };
}
