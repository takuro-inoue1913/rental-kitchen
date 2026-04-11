import { requireAdmin } from "@/lib/admin-auth";
import { stripe } from "@/lib/stripe";
import { calculateRefund, isCancellable } from "@/lib/cancellation";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import type { NextRequest } from "next/server";

/**
 * POST /api/admin/reservations/[id]/cancel
 *
 * 管理者が予約をキャンセルする。
 * キャンセルポリシーに基づき返金額を計算し、二重キャンセルを防ぐため
 * 先にステータスを cancelled に更新したうえで、必要に応じて
 * Stripe Refund API で返金する。
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // 1. 予約取得
  const { data: reservation, error: fetchError } = await auth.adminClient
    .from("reservations")
    .select(
      "id, user_id, date, status, total_price, stripe_payment_intent_id, google_event_id",
    )
    .eq("id", id)
    .single();

  if (fetchError || !reservation) {
    return Response.json({ error: "予約が見つかりません" }, { status: 404 });
  }

  // 2. キャンセル可否チェック
  if (!isCancellable(reservation.status, reservation.date)) {
    return Response.json(
      { error: "この予約はキャンセルできません" },
      { status: 400 },
    );
  }

  // 3. 返金額計算
  const policy = calculateRefund(reservation.date, reservation.total_price);

  // 4. ステータス更新（二重キャンセル防止）
  const { data: updated, error: updateError } = await auth.adminClient
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "confirmed")
    .select("id")
    .single();

  if (updateError || !updated) {
    return Response.json(
      { error: "この予約は既にキャンセルされているか、キャンセルできません" },
      { status: 409 },
    );
  }

  // 5. Stripe 返金（返金額 > 0 かつ payment_intent_id が存在する場合）
  let refundWarning: string | null = null;
  if (policy.refundAmount > 0 && reservation.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
        amount: policy.refundAmount,
      });

      const { error: refundAmountUpdateError } = await auth.adminClient
        .from("reservations")
        .update({ refund_amount: policy.refundAmount })
        .eq("id", id);

      if (refundAmountUpdateError) {
        console.error("Refund amount update failed after Stripe refund:", {
          reservationId: id,
          refundAmount: policy.refundAmount,
          error: refundAmountUpdateError,
        });
        refundWarning =
          "キャンセルとStripe返金は完了しましたが、返金額の記録に失敗しました。管理画面またはDBを確認してください。";
      }
    } catch (err) {
      console.error("Stripe refund failed:", err);
      refundWarning =
        "キャンセルは完了しましたが返金処理に失敗しました。Stripe ダッシュボードから手動で返金してください。";
    }
  }

  // 6. Google カレンダーのイベントを削除
  if (reservation.google_event_id) {
    await deleteCalendarEvent(reservation.google_event_id);
  }

  return Response.json({
    success: true,
    refundPercent: policy.refundPercent,
    refundAmount: policy.refundAmount,
    cancellationFee: policy.cancellationFee,
    ...(refundWarning ? { warning: refundWarning } : {}),
  });
}
