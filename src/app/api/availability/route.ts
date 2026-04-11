import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getEffectiveDayOfWeek } from "@/lib/date-utils";
import {
  generateAvailability,
  emptyAvailability,
} from "@/lib/availability";
import type { Database } from "@/lib/database.types";
import { NextRequest } from "next/server";

type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];

// 型の再エクスポート（既存の import 先との互換性維持）
export type {
  TimeSlot,
  TimeBlock,
  AvailabilityResponse,
} from "@/lib/availability";

/**
 * GET /api/availability?date=2026-04-10
 *
 * 指定日の空き枠を返す。
 * Google カレンダーの予約で空き判定する。
 * （確定済み予約は Webhook で Google カレンダーに自動反映されるため、
 *   カレンダーが信頼できるソースとなる）
 */
export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json(
      { error: "date パラメータが必要です（YYYY-MM-DD 形式）" },
      { status: 400 },
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
    return Response.json(emptyAvailability(dateParam));
  }

  // 曜日を取得（祝日は日曜扱い → 土日祝で同じ料金体系）
  const dayOfWeek = getEffectiveDayOfWeek(dateParam);

  // 該当曜日の営業ルールを取得
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .returns<AvailabilityRule[]>();

  if (!rules || rules.length === 0) {
    return Response.json(emptyAvailability(dateParam));
  }

  const rule = rules[0];

  const calendarEvents = await getCalendarEvents(dateParam);

  return Response.json(generateAvailability(dateParam, rule, calendarEvents));
}
