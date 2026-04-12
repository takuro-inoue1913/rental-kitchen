import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/blocked-dates
 * 休業日一覧を日付順で返す。
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.adminClient
    .from("blocked_dates")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ blocked_dates: data });
}

/**
 * POST /api/admin/blocked-dates
 * 休業日を追加する。
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { date, reason } = body;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { error: "日付は YYYY-MM-DD 形式で指定してください" },
      { status: 400 },
    );
  }

  // 重複チェック
  const { data: existing } = await auth.adminClient
    .from("blocked_dates")
    .select("id")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: "この日付は既に休業日として登録されています" },
      { status: 409 },
    );
  }

  const { data, error } = await auth.adminClient
    .from("blocked_dates")
    .insert({ date, reason: reason || null })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ blocked_date: data }, { status: 201 });
}

/**
 * DELETE /api/admin/blocked-dates?id=xxx
 * 休業日を削除する。
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id が必要です" }, { status: 400 });
  }

  const { error } = await auth.adminClient
    .from("blocked_dates")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
