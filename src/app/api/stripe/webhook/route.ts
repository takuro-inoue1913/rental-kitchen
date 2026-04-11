import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendReservationConfirmation } from "@/lib/email";
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
        .select("id, date, start_time, end_time, guest_name, guest_email, google_event_id")
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

      // 選択オプション情報を取得（カレンダー・メール共通で使用）
      const { data: resOptions } = await supabase
        .from("reservation_options")
        .select("quantity, price_at_booking, option:options(name)")
        .eq("reservation_id", updated.id);

      const optionList = (resOptions ?? []).map((o) => ({
        name: (o.option as { name: string } | null)?.name ?? "オプション",
        quantity: o.quantity,
        price: o.price_at_booking,
      }));

      // Google カレンダーにイベントを作成（未作成の場合のみ）
      if (!updated.google_event_id) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
        const optionLines = optionList.map(
          (o) => `  - ${o.name} ×${o.quantity}（¥${o.price.toLocaleString()}）`,
        );

        const eventId = await createCalendarEvent({
          date: updated.date,
          startTime: updated.start_time.slice(0, 5),
          endTime: updated.end_time.slice(0, 5),
          summary: "オーナー利用",
          description: [
            `予約ID: ${updated.id}`,
            `予約者名: ${updated.guest_name ?? "—"}`,
            `メール: ${updated.guest_email ?? "—"}`,
            `予約時間: ${updated.start_time.slice(0, 5)}-${updated.end_time.slice(0, 5)}`,
            ...(optionLines.length > 0
              ? ["", "オプション:", ...optionLines]
              : []),
            "",
            `管理画面: ${siteUrl}/admin/reservations/${updated.id}`,
          ].join("\n"),
        });

        if (eventId) {
          await supabase
            .from("reservations")
            .update({ google_event_id: eventId })
            .eq("id", updated.id);
        } else {
          console.error("Webhook: Google Calendar event creation failed", {
            reservationId: updated.id,
          });
        }
      }

      // 予約確定メール送信
      if (updated.guest_email) {
        // 合計金額を取得
        const { data: fullRes } = await supabase
          .from("reservations")
          .select("total_price")
          .eq("id", updated.id)
          .single();

        const sent = await sendReservationConfirmation({
          to: updated.guest_email,
          guestName: updated.guest_name ?? "ゲスト",
          date: updated.date,
          startTime: updated.start_time.slice(0, 5),
          endTime: updated.end_time.slice(0, 5),
          totalPrice: fullRes?.total_price ?? 0,
          options: optionList,
          reservationId: updated.id,
        });

        if (!sent) {
          console.error("Webhook: confirmation email failed", {
            reservationId: updated.id,
            to: updated.guest_email,
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
