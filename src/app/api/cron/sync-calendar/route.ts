import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEventsRaw } from "@/lib/google-calendar";
import type { NextRequest } from "next/server";

/**
 * GET /api/cron/sync-calendar
 *
 * Google カレンダー → Supabase の同期。
 * Vercel Cron で定期実行し、カレンダー上のイベントを reservations に取り込む。
 * google_event_id で重複排除。
 *
 * CRON_SECRET ヘッダーで認証する。
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 認証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 今日から 60 日先までを同期対象にする
  const today = new Date();
  const startDate = today.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  });
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 60);
  const endDate = futureDate.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  });

  // Google カレンダーからイベントを取得
  const events = await getCalendarEventsRaw(startDate, endDate);
  if (events.length === 0) {
    return Response.json({ synced: 0, skipped: 0 });
  }

  // 既に DB に存在する google_event_id を取得
  const eventIds = events.map((e) => e.id);
  const { data: existing } = await supabase
    .from("reservations")
    .select("google_event_id")
    .in("google_event_id", eventIds);

  const existingIds = new Set(
    (existing ?? []).map((r) => r.google_event_id),
  );

  // 新規イベントのみ insert
  let synced = 0;
  let skipped = 0;

  for (const event of events) {
    if (existingIds.has(event.id)) {
      skipped++;
      continue;
    }

    const startTime = event.isAllDay ? "00:00:00" : `${event.start}:00`;
    const endTime = event.isAllDay ? "23:59:00" : `${event.end}:00`;

    const { error } = await supabase.from("reservations").insert({
      date: event.date,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
      source: "google_calendar",
      google_event_id: event.id,
      base_price: 0,
      total_price: 0,
      notes: event.summary || null,
    });

    if (error) {
      // UNIQUE 制約違反（google_event_id の重複）はスキップ
      if (error.code === "23505") {
        skipped++;
      } else {
        console.error("Sync insert error:", {
          eventId: event.id,
          error,
        });
      }
    } else {
      synced++;
    }
  }

  return Response.json({ synced, skipped });
}
