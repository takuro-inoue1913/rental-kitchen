import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEventsForRange } from "@/lib/google-calendar";
import { getEffectiveDayOfWeek } from "@/lib/date-utils";
import {
  generateAvailability,
  emptyAvailability,
} from "@/lib/availability";
import type { AvailabilityResponse } from "@/lib/availability";
import type { Database } from "@/lib/database.types";

type AvailabilityRule =
  Database["public"]["Tables"]["availability_rules"]["Row"];

/**
 * GET /api/availability/month?month=2026-04
 *
 * 指定月の全日分の空き枠を一括で返す。
 * Google Calendar API を1回だけ呼び出し、日ごとにスロットを生成する。
 */
export async function GET(request: NextRequest) {
  const monthParam = request.nextUrl.searchParams.get("month");

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return Response.json(
      { error: "month パラメータが必要です（YYYY-MM 形式）" },
      { status: 400 },
    );
  }

  const [yearStr, monthStr] = monthParam.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const firstDay = `${monthParam}-01`;
  const lastDate = new Date(year, month, 0); // month is 1-indexed → 0-indexed trick
  const lastDay = `${monthParam}-${lastDate.getDate().toString().padStart(2, "0")}`;
  const daysInMonth = lastDate.getDate();

  const supabase = createAdminClient();

  // 3つのデータソースを並列取得
  const [blockedResult, rulesResult, calendarEventsMap] = await Promise.all([
    supabase
      .from("blocked_dates")
      .select("date")
      .gte("date", firstDay)
      .lte("date", lastDay),
    supabase
      .from("availability_rules")
      .select("*")
      .eq("is_active", true)
      .returns<AvailabilityRule[]>(),
    getCalendarEventsForRange(firstDay, lastDay),
  ]);

  const blockedSet = new Set(
    (blockedResult.data ?? []).map((d) => d.date),
  );

  const rulesByDow = new Map<number, AvailabilityRule>();
  for (const rule of rulesResult.data ?? []) {
    rulesByDow.set(rule.day_of_week, rule);
  }

  // 月の各日についてスロットを生成
  const result: Record<string, AvailabilityResponse> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthParam}-${d.toString().padStart(2, "0")}`;

    if (blockedSet.has(dateStr)) {
      result[dateStr] = emptyAvailability(dateStr);
      continue;
    }

    const dow = getEffectiveDayOfWeek(dateStr);
    const rule = rulesByDow.get(dow);

    if (!rule) {
      result[dateStr] = emptyAvailability(dateStr);
      continue;
    }

    const events = calendarEventsMap[dateStr] ?? [];
    result[dateStr] = generateAvailability(dateStr, rule, events);
  }

  return Response.json(result);
}
