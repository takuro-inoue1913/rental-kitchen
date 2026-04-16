import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmReservation } from "@/lib/confirm-reservation";
import { getCalendarEvents } from "@/lib/google-calendar";
import { timeToMinutes } from "@/lib/time-utils";
import { sendCancellationEmail } from "@/lib/email";
import { NextRequest } from "next/server";

/**
 * Stripe metadata から予約情報を復元する。
 * checkout route で格納した値をパースして返す。
 */
function parseReservationMetadata(metadata: Record<string, string>) {
  const options: { id: string; name: string; price: number }[] = metadata.options
    ? JSON.parse(metadata.options)
    : [];

  return {
    date: metadata.date,
    startTime: metadata.start_time,
    endTime: metadata.end_time,
    guestEmail: metadata.guest_email,
    guestName: metadata.guest_name,
    basePrice: Number(metadata.base_price),
    totalPrice: Number(metadata.total_price),
    billingType: metadata.billing_type,
    companyName: metadata.company_name ?? null,
    companyDepartment: metadata.company_department ?? null,
    contactPersonName: metadata.contact_person_name ?? null,
    usagePurpose: metadata.usage_purpose ?? null,
    userId: metadata.user_id ?? null,
    options,
  };
}

/**
 * Google カレンダーで空き状況を再チェックする。
 * 決済完了〜予約作成の間に別の予約が入った場合を検知する。
 */
async function hasScheduleConflict(
  date: string,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const calendarEvents = await getCalendarEvents(date);
  const bookedRanges = calendarEvents
    .filter((e) => !e.isAllDay)
    .map((e) => ({ start: e.startTime, end: e.endTime }));
  const hasAllDay = calendarEvents.some((e) => e.isAllDay);

  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  return (
    hasAllDay ||
    bookedRanges.some(
      (r) => timeToMinutes(r.start) < reqEnd && timeToMinutes(r.end) > reqStart
    )
  );
}

/**
 * POST /api/stripe/webhook
 *
 * Stripe Webhook ハンドラ。
 * checkout.session.completed → 空き再チェック後、予約を confirmed で新規作成
 * checkout.session.expired → 予約レコードは未作成なので何もしない
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata;
      if (!metadata?.date) break;

      // 決済が完了していることを確認
      if (session.payment_status !== "paid") {
        console.warn(
          `Webhook: session ${session.id} payment_status is ${session.payment_status}, skipping`
        );
        break;
      }

      const reservationData = parseReservationMetadata(
        metadata as Record<string, string>,
      );

      // 空き状況を再チェック（二重予約防止）
      const conflict = await hasScheduleConflict(
        reservationData.date,
        reservationData.startTime,
        reservationData.endTime,
      );

      if (conflict) {
        console.error(
          "Webhook: schedule conflict detected, refunding payment",
          { sessionId: session.id, date: reservationData.date },
        );

        // 全額返金
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;
        if (paymentIntentId) {
          try {
            await stripe.refunds.create({
              payment_intent: paymentIntentId,
            });
          } catch (refundErr) {
            console.error("Webhook: refund failed:", refundErr);
          }
        }

        return Response.json({
          error: "Schedule conflict - refund issued",
        }, { status: 409 });
      }

      // 予約作成 + Google カレンダー + メール
      const result = await confirmReservation({
        ...reservationData,
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
      // 予約レコードは決済完了まで作成しないため、何もしない
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

      const supabase = createAdminClient();

      const { data: reservation } = await supabase
        .from("reservations")
        .select("id, status, date, start_time, end_time, total_price, guest_email, guest_name, billing_type, company_name")
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
              companyName: reservation.billing_type === "corporate" ? reservation.company_name : null,
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
