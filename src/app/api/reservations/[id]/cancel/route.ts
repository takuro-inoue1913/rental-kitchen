import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculateRefund, isCancellable } from "@/lib/cancellation";
import type { NextRequest } from "next/server";

/**
 * POST /api/reservations/[id]/cancel
 *
 * 認証済みユーザーが自分の予約をキャンセルする。
 * キャンセルポリシーに基づき返金額を計算し、Stripe Refund API で返金後、
 * ステータスを cancelled に更新する。
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. 認証チェック
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 2. 予約取得（admin client で RLS バイパス）
  const supabase = createAdminClient();
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select(
      "id, user_id, date, status, total_price, stripe_payment_intent_id",
    )
    .eq("id", id)
    .single();

  if (fetchError || !reservation) {
    return Response.json({ error: "予約が見つかりません" }, { status: 404 });
  }

  // 3. 所有権チェック
  if (reservation.user_id !== user.id) {
    return Response.json(
      { error: "この予約をキャンセルする権限がありません" },
      { status: 403 },
    );
  }

  // 4. キャンセル可否チェック
  if (!isCancellable(reservation.status, reservation.date)) {
    return Response.json(
      { error: "この予約はキャンセルできません" },
      { status: 400 },
    );
  }

  // 5. 返金額計算
  const policy = calculateRefund(reservation.date, reservation.total_price);

  // 6. ステータス更新を先に行い、二重キャンセルを防止
  //    confirmed → cancelled の更新が成功したリクエストのみ返金を実行する
  const { data: updated, error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      refund_amount: policy.refundAmount,
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

  // 7. Stripe 返金（返金額 > 0 かつ payment_intent_id が存在する場合）
  if (policy.refundAmount > 0 && reservation.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
        amount: policy.refundAmount,
      });
    } catch (err) {
      console.error("Stripe refund failed:", err);
      // DB は cancelled 済みだが返金失敗 → 手動対応が必要
      return Response.json(
        {
          error:
            "キャンセルは完了しましたが返金処理に失敗しました。お手数ですがお問い合わせください。",
        },
        { status: 500 },
      );
    }
  }

  return Response.json({
    success: true,
    refundPercent: policy.refundPercent,
    refundAmount: policy.refundAmount,
    cancellationFee: policy.cancellationFee,
  });
}
