import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEventsRaw } from "@/lib/google-calendar";
import type { NextRequest } from "next/server";

/**
 * GET /api/cron/sync-calendar
 *
 * Google カレンダー → Supabase の同期。
 * Vercel Cron で定期実行し、カレンダー上のイベントを reservations に取り込む。
 * google_event_id で重複排除（upsert + onConflict）。
 *
 * CRON_SECRET ヘッダーで認証する。
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET 必須チェック
  const cronSecret = process.env.CRON_SECRET;
  if (typeof cronSecret !== "string" || cronSecret.trim() === "") {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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
  const { data: existing, error: existingError } = await supabase
    .from("reservations")
    .select("google_event_id")
    .in("google_event_id", eventIds);

  if (existingError) {
    console.error("Sync existing google_event_id fetch error:", {
      eventIds,
      error: existingError,
    });
    return Response.json(
      { error: "Failed to fetch existing reservations" },
      { status: 500 },
    );
  }

  const existingIds = new Set(
    (existing ?? []).map((r) => r.google_event_id),
  );

  // 新規イベントのみ一括 upsert
  const newRows = events
    .filter((e) => !existingIds.has(e.id))
    .map((event) => ({
      date: event.date,
      start_time: event.isAllDay ? "00:00:00" : `${event.start}:00`,
      end_time: event.isAllDay ? "23:59:00" : `${event.end}:00`,
      status: "confirmed" as const,
      source: "google_calendar" as const,
      google_event_id: event.id,
      base_price: 0,
      total_price: 0,
      notes: event.summary || null,
    }));

  const skipped = events.length - newRows.length;

  if (newRows.length === 0) {
    return Response.json({ synced: 0, skipped });
  }

  const { error: upsertError, count } = await supabase
    .from("reservations")
    .upsert(newRows, { onConflict: "google_event_id", count: "exact" });

  if (upsertError) {
    console.error("Sync upsert error:", upsertError);
    return Response.json(
      { error: "Failed to sync reservations" },
      { status: 500 },
    );
  }

  return Response.json({ synced: count ?? newRows.length, skipped });
}
