import { requireAdmin } from "@/lib/admin-auth";
import { confirmPendingReservation } from "@/lib/confirm-reservation";
import type { NextRequest } from "next/server";

/**
 * POST /api/admin/reservations/[id]/confirm
 *
 * 管理者が pending 予約を手動で confirmed にする。
 * Stripe Webhook が届かないテスト環境で、
 * Google カレンダー作成・確認メール送信を含む確定処理を実行する。
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const result = await confirmPendingReservation(id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  if (result.alreadyConfirmed) {
    return Response.json({ message: "既に確定済みです", reservationId: id });
  }

  return Response.json({
    success: true,
    reservationId: result.reservationId,
  });
}
