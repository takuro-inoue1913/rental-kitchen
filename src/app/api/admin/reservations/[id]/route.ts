import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/reservations/[id]
 *
 * 管理者用: 予約詳細取得（オプション含む）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data: reservation, error } = await auth.adminClient
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !reservation) {
    return Response.json({ error: "予約が見つかりません" }, { status: 404 });
  }

  // オプション情報を取得
  const { data: options } = await auth.adminClient
    .from("reservation_options")
    .select("quantity, price_at_booking, option:options(name)")
    .eq("reservation_id", id);

  return Response.json({ reservation, options: options ?? [] });
}
