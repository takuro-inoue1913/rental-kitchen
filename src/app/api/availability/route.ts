import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/types";
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
  slots: TimeSlot[];
};

/**
 * GET /api/availability?date=2026-04-10
 *
 * 指定日の空き枠を返す。
 * availability_rules から該当曜日のスロットを生成し、
 * 既存の reservations (pending/confirmed) と blocked_dates を突き合わせて
 * available フラグを設定する。
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
    return Response.json({ date: dateParam, slots: [] });
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
    return Response.json({ date: dateParam, slots: [] });
  }

  // 該当日の予約（pending/confirmed）を取得
  const { data: reservations } = await supabase
    .from("reservations")
    .select("start_time, end_time")
    .eq("date", dateParam)
    .in("status", ["pending", "confirmed"])
    .returns<Reservation[]>();

  const bookedRanges = (reservations ?? []).map((r) => ({
    start: r.start_time,
    end: r.end_time,
  }));

  // ルールからスロットを生成
  const slots: TimeSlot[] = [];

  for (const rule of rules) {
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
  }

  // 開始時間でソート
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return Response.json({ date: dateParam, slots } satisfies AvailabilityResponse);
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
