import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, PricingType } from "@/lib/types";
import { NextRequest } from "next/server";

type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];
type Reservation = Pick<Database["public"]["Tables"]["reservations"]["Row"], "start_time" | "end_time">;

export type TimeSlot = {
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
};

export type AvailabilityResponse = {
  date: string;
  pricingType: PricingType;
  dailyPrice: number | null;
  slots: TimeSlot[];
};

/**
 * GET /api/availability?date=2026-04-10
 *
 * 指定日の空き枠を返す。
 * pricing_type が daily の場合は丸一日料金を返し、slots は空き確認用。
 * pricing_type が hourly の場合は時間枠ごとの料金を返す。
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
    });
  }

  const rule = rules[0];
  const pricingType = rule.pricing_type;

  // 該当日の予約（pending/confirmed）を取得
  const { data: reservations } = await supabase
    .from("reservations")
    .select("start_time, end_time")
    .eq("date", dateParam)
    .in("status", ["pending", "confirmed"])
    .returns<Reservation[]>();

  const hasBooking = (reservations ?? []).length > 0;

  // daily の場合: 丸一日の空き状況を返す
  if (pricingType === "daily") {
    return Response.json({
      date: dateParam,
      pricingType: "daily",
      dailyPrice: rule.price_per_slot,
      slots: [
        {
          startTime: rule.start_time,
          endTime: rule.end_time,
          price: rule.price_per_slot,
          available: !hasBooking,
        },
      ],
    } satisfies AvailabilityResponse);
  }

  // hourly の場合: 時間枠ごとの空き状況を返す
  const bookedRanges = (reservations ?? []).map((r) => ({
    start: r.start_time,
    end: r.end_time,
  }));

  const slots: TimeSlot[] = [];
  const startMinutes = timeToMinutes(rule.start_time);
  const endMinutes = timeToMinutes(rule.end_time);
  const duration = rule.slot_duration_minutes;

  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const slotStart = minutesToTime(m);
    const slotEnd = minutesToTime(m + duration);

    const isBooked = bookedRanges.some(
      (r) =>
        timeToMinutes(r.start) < m + duration && timeToMinutes(r.end) > m
    );

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      price: rule.price_per_slot,
      available: !isBooked,
    });
  }

  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return Response.json({
    date: dateParam,
    pricingType: "hourly",
    dailyPrice: null,
    slots,
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
