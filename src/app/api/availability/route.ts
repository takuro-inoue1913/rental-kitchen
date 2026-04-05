import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/google-calendar";
import type { PricingType } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { NextRequest } from "next/server";

type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];
type Reservation = Pick<Database["public"]["Tables"]["reservations"]["Row"], "start_time" | "end_time">;

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

/**
 * GET /api/availability?date=2026-04-10
 *
 * 指定日の空き枠を返す。
 * Supabase の reservations + Google カレンダーの予約を突き合わせて判定。
 */
export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json(
      { error: "date パラメータが必要です（YYYY-MM-DD 形式）" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 休業日チェック
  const { data: blockedDate } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("date", dateParam)
    .maybeSingle();

  if (blockedDate) {
    return Response.json({
      date: dateParam,
      pricingType: "hourly",
      dailyPrice: null,
      slots: [],
      blocks: [],
    });
  }

  // 曜日を取得（0=日, 1=月, ..., 6=土）
  const dayOfWeek = new Date(dateParam + "T00:00:00").getDay();

  // 該当曜日の営業ルールを取得
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .returns<AvailabilityRule[]>();

  if (!rules || rules.length === 0) {
    return Response.json({
      date: dateParam,
      pricingType: "hourly",
      dailyPrice: null,
      slots: [],
      blocks: [],
    });
  }

  const rule = rules[0];
  const pricingType = rule.pricing_type as PricingType;

  // Supabase の予約と Google カレンダーのイベントを並行取得
  const [{ data: reservations }, calendarEvents] = await Promise.all([
    supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("date", dateParam)
      .in("status", ["pending", "confirmed"])
      .returns<Reservation[]>(),
    getCalendarEvents(dateParam),
  ]);

  // 予約済み時間帯を統合（DB + Google カレンダー）
  const bookedRanges = [
    ...(reservations ?? []).map((r) => ({
      start: r.start_time,
      end: r.end_time,
    })),
    ...calendarEvents
      .filter((e) => !e.isAllDay)
      .map((e) => ({
        start: e.startTime,
        end: e.endTime,
      })),
  ];

  const hasAllDayEvent = calendarEvents.some((e) => e.isAllDay);

  // 時間枠を生成（daily / hourly 共通）
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
          timeToMinutes(r.start) < m + duration && timeToMinutes(r.end) > m
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
        if (blockStart === null) {
          blockStart = slot.startTime;
        }
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
    // 最後のブロック
    if (blockStart !== null && blockEnd !== null) {
      blocks.push({
        startTime: blockStart,
        endTime: blockEnd,
        price: rule.price_per_slot,
      });
    }
  }

  return Response.json({
    date: dateParam,
    pricingType,
    dailyPrice: pricingType === "daily" ? rule.price_per_slot : null,
    slots,
    blocks,
  } satisfies AvailabilityResponse);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
