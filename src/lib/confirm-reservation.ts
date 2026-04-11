import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendReservationConfirmation } from "@/lib/email";

type ConfirmResult =
  | { ok: true; reservationId: string; alreadyConfirmed: boolean }
  | { ok: false; error: string };

/**
 * 予約を confirmed に更新し、Google カレンダー作成 + 確認メール送信を行う。
 * Stripe Webhook とテスト用 API の両方から呼べる共通ロジック。
 */
export async function confirmReservation(
  reservationId: string,
  options?: {
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  },
): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  // 1. ステータス更新
  const { data: updated, error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      ...(options?.stripeCheckoutSessionId
        ? { stripe_checkout_session_id: options.stripeCheckoutSessionId }
        : {}),
      ...(options?.stripePaymentIntentId
        ? { stripe_payment_intent_id: options.stripePaymentIntentId }
        : {}),
    })
    .eq("id", reservationId)
    .eq("status", "pending")
    .select(
      "id, date, start_time, end_time, guest_name, guest_email, google_event_id",
    )
    .maybeSingle();

  if (error) {
    console.error("confirmReservation: DB update failed:", error);
    return { ok: false, error: "DB update failed" };
  }

  // 0件更新 = 既に confirmed → 冪等に成功扱い
  if (!updated) {
    return { ok: true, reservationId, alreadyConfirmed: true };
  }

  // 2. オプション情報を取得（カレンダー・メール共通）
  const { data: resOptions } = await supabase
    .from("reservation_options")
    .select("quantity, price_at_booking, option:options(name)")
    .eq("reservation_id", updated.id);

  const optionList = (resOptions ?? []).map((o) => ({
    name: (o.option as { name: string } | null)?.name ?? "オプション",
    quantity: o.quantity,
    price: o.price_at_booking,
  }));

  // 3. Google カレンダーにイベント作成（未作成の場合のみ）
  if (!updated.google_event_id) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
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
      console.error("confirmReservation: Google Calendar event creation failed", {
        reservationId: updated.id,
      });
    }
  }

  // 4. 確認メール送信
  if (updated.guest_email) {
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
      console.error("confirmReservation: email failed", {
        reservationId: updated.id,
        to: updated.guest_email,
      });
    }
  }

  return { ok: true, reservationId: updated.id, alreadyConfirmed: false };
}
