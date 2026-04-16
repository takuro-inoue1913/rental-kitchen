import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmReservation } from "@/lib/confirm-reservation";
import { getCalendarEvents } from "@/lib/google-calendar";
import { timeToMinutes } from "@/lib/time-utils";
import { sendCancellationEmail } from "@/lib/email";
import { NextRequest } from "next/server";

type ParsedMetadata = {
  date: string;
  startTime: string;
  endTime: string;
  guestEmail: string;
  guestName: string;
  basePrice: number;
  totalPrice: number;
  billingType: string;
  companyName: string | null;
  companyDepartment: string | null;
  contactPersonName: string | null;
  usagePurpose: string | null;
  userId: string | null;
  optionIds: string[];
};

/**
 * Stripe metadata から予約情報を復元・検証する。
 * 必須キーが欠けている場合や数値が不正な場合は null を返す。
 */
function parseReservationMetadata(
  metadata: Record<string, string>,
): ParsedMetadata | null {
  const { date, start_time, end_time, guest_email, guest_name, base_price, total_price } = metadata;

  if (!date || !start_time || !end_time || !guest_email || !guest_name) {
    return null;
  }

  const basePrice = Number(base_price);
  const totalPrice = Number(total_price);
  if (Number.isNaN(basePrice) || Number.isNaN(totalPrice)) {
    return null;
  }

  let optionIds: string[] = [];
  if (metadata.option_ids) {
    optionIds = metadata.option_ids.split(",").filter(Boolean);
  }

  return {
    date,
    startTime: start_time,
    endTime: end_time,
    guestEmail: guest_email,
    guestName: guest_name,
    basePrice,
    totalPrice,
    billingType: metadata.billing_type ?? "individual",
    companyName: metadata.company_name ?? null,
    companyDepartment: metadata.company_department ?? null,
    contactPersonName: metadata.contact_person_name ?? null,
    usagePurpose: metadata.usage_purpose ?? null,
    userId: metadata.user_id ?? null,
    optionIds,
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
 *
 * 注意: Stripe は非 2xx 応答時にリトライするため、
 * 処理済みイベントや衝突時も 200 で応答する。
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

      // metadata を検証・パース
      const reservationData = parseReservationMetadata(
        metadata as Record<string, string>,
      );

      if (!reservationData) {
        console.error("Webhook: invalid metadata, skipping", {
          sessionId: session.id,
          metadata,
        });
        break;
      }

      // オプション情報を DB から取得
      let options: { id: string; name: string; price: number }[] = [];
      if (reservationData.optionIds.length > 0) {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("options")
          .select("id, name, price")
          .in("id", reservationData.optionIds)
          .eq("is_active", true);
        options = data ?? [];
      }

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

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;
        if (paymentIntentId) {
          try {
            await stripe.refunds.create(
              { payment_intent: paymentIntentId },
              { idempotencyKey: `refund-conflict-${session.id}` },
            );
          } catch (refundErr) {
            console.error("Webhook: refund failed:", refundErr);
          }
        }

        // 衝突時も 200 で応答（Stripe リトライ防止）
        break;
      }

      // 予約作成 + Google カレンダー + メール
      const result = await confirmReservation({
        ...reservationData,
        options,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
      });

      if (!result.ok) {
        console.error("Webhook: confirmReservation failed:", result.error);
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
