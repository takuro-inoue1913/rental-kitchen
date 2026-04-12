import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

/**
 * GET /api/admin/reservations?date_from=&date_to=&status=
 *
 * 管理者用: 予約一覧取得（フィルタ対応）
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const status = searchParams.get("status");

  let query = auth.adminClient
    .from("reservations")
    .select(
      "id, date, start_time, end_time, status, total_price, guest_name, guest_email, source, billing_type, company_name, created_at",
    )
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Admin reservations fetch error:", error);
    return Response.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  return Response.json({ reservations: data });
}
