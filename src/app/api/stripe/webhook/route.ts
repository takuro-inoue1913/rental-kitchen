import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmReservation } from "@/lib/confirm-reservation";
import { sendCancellationEmail } from "@/lib/email";
import { NextRequest } from "next/server";

/**
 * POST /api/stripe/webhook
 *
 * Stripe Webhook ハンドラ。
 * checkout.session.completed → 予約を confirmed に（pending のみ対象、payment_status 確認）
 * checkout.session.expired → 予約を cancelled に（pending のみ対象）
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const reservationId = session.metadata?.reservation_id;
      if (!reservationId) break;

      // 決済が完了していることを確認
      if (session.payment_status !== "paid") {
        console.warn(
          `Webhook: session ${session.id} payment_status is ${session.payment_status}, skipping`
        );
        break;
      }

      const result = await confirmReservation(reservationId, {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
      });

      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const reservationId = session.metadata?.reservation_id;
      if (!reservationId) break;

      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId)
        .eq("status", "pending");

      if (error) {
        console.error("Webhook: failed to cancel reservation:", error);
        return Response.json(
          { error: "DB update failed" },
          { status: 500 }
        );
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null;
      if (!paymentIntentId) break;

      // 部分返金（調整返金等）では予約をキャンセルしない
      // 全額返金時のみキャンセル扱いにする
      if (charge.amount_refunded < charge.amount) break;

      const { data: reservation } = await supabase
        .from("reservations")
        .select("id, status, date, start_time, end_time, total_price, guest_email, guest_name")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .single();

      if (!reservation || reservation.status !== "confirmed") break;

      const { error } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          refund_amount: charge.amount_refunded,
        })
        .eq("id", reservation.id)
        .eq("status", "confirmed");

      if (error) {
        console.error("Webhook: failed to cancel refunded reservation:", error);
        return Response.json(
          { error: "DB update failed" },
          { status: 500 }
        );
      }

      // キャンセルメール送信（fire-and-forget）
      if (reservation.guest_email) {
        void (async () => {
          try {
            await sendCancellationEmail({
              to: reservation.guest_email!,
              guestName: reservation.guest_name ?? "ゲスト",
              date: reservation.date,
              startTime: reservation.start_time.slice(0, 5),
              endTime: reservation.end_time.slice(0, 5),
              totalPrice: reservation.total_price,
              refundAmount: charge.amount_refunded,
              reservationId: reservation.id,
            });
          } catch (err) {
            console.error("Webhook: cancellation email failed:", err);
          }
        })();
      }
      break;
    }
  }

  return Response.json({ received: true });
}
