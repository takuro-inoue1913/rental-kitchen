import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarEvent } from "@/lib/google-calendar";
import { SITE_NAME } from "@/lib/constants";
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

      const { data: updated, error } = await supabase
        .from("reservations")
        .update({
          status: "confirmed",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .eq("id", reservationId)
        .eq("status", "pending")
        .select("id, date, start_time, end_time, google_event_id")
        .maybeSingle();

      if (error) {
        console.error("Webhook: failed to confirm reservation:", error);
        return Response.json(
          { error: "DB update failed" },
          { status: 500 }
        );
      }

      // 0件更新 = 既に confirmed（Webhook 再送）→ 冪等に成功扱い
      if (!updated) break;

      // Google カレンダーにイベントを作成（未作成の場合のみ）
      if (!updated.google_event_id) {
        const eventId = await createCalendarEvent({
          date: updated.date,
          startTime: updated.start_time.slice(0, 5),
          endTime: updated.end_time.slice(0, 5),
          summary: `【予約】${SITE_NAME}`,
          description: [
            `予約ID: ${updated.id}`,
            `時間: ${updated.start_time.slice(0, 5)}-${updated.end_time.slice(0, 5)}`,
          ].join("\n"),
        });

        if (eventId) {
          await supabase
            .from("reservations")
            .update({ google_event_id: eventId })
            .eq("id", updated.id);
        } else {
          // カレンダー作成失敗 → ログに記録。次回の cron 同期で手動対応可能
          console.error("Webhook: Google Calendar event creation failed", {
            reservationId: updated.id,
          });
        }
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
        .select("id, status")
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
      break;
    }
  }

  return Response.json({ received: true });
}
