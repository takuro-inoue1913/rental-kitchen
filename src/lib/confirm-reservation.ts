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
 *
 * メール送信は Webhook の応答を遅らせないよう fire-and-forget で実行する。
 */
export async function confirmReservation(
  reservationId: string,
  options?: {
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  },
): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  // 1. ステータス更新（total_price も取得してメール用に使う）
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
      "id, date, start_time, end_time, guest_name, guest_email, google_event_id, total_price, billing_type, company_name",
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

  const needsCalendar = !updated.google_event_id;
  const needsEmail = !!updated.guest_email;

  // 2. オプション情報を取得（カレンダーまたはメールが必要な場合のみ）
  let optionList: { name: string; quantity: number; price: number }[] = [];
  if (needsCalendar || needsEmail) {
    const { data: resOptions, error: optionsError } = await supabase
      .from("reservation_options")
      .select("quantity, price_at_booking, option:options(name)")
      .eq("reservation_id", updated.id);

    if (optionsError) {
      console.error("confirmReservation: options fetch failed:", {
        reservationId: updated.id,
        error: optionsError,
      });
    } else {
      optionList = (resOptions ?? []).map((o) => ({
        name: (o.option as { name: string } | null)?.name ?? "オプション",
        quantity: o.quantity,
        price: o.price_at_booking,
      }));
    }
  }

  // 3. Google カレンダーにイベント作成（未作成の場合のみ）
  if (needsCalendar) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://localhost:3000");
    const optionLines = optionList.map(
      (o) => `  - ${o.name} ×${o.quantity}（¥${o.price.toLocaleString()}）`,
    );

    const isCorporate = updated.billing_type === "corporate" && updated.company_name;
    const eventId = await createCalendarEvent({
      date: updated.date,
      startTime: updated.start_time.slice(0, 5),
      endTime: updated.end_time.slice(0, 5),
      summary: "オーナー利用",
      description: [
        ...(isCorporate ? [`法人: ${updated.company_name}`] : []),
        `名前: ${updated.guest_name ?? "—"}`,
        `メール: ${updated.guest_email ?? "—"}`,
        `予約時間: ${updated.start_time.slice(0, 5)}-${updated.end_time.slice(0, 5)}`,
        ...(optionLines.length > 0
          ? ["", "オプション:", ...optionLines]
          : []),
        "",
        `${siteUrl}/admin/reservations/${updated.id}`,
      ].join("\n"),
    });

    if (eventId) {
      await supabase
        .from("reservations")
        .update({ google_event_id: eventId })
        .eq("id", updated.id);
    } else {
      console.error(
        "confirmReservation: Google Calendar event creation failed",
        { reservationId: updated.id },
      );
    }
  }

  // 4. 確認メール送信（fire-and-forget: Webhook 応答を遅らせない）
  if (needsEmail) {
    void (async () => {
      try {
        const sent = await sendReservationConfirmation({
          to: updated.guest_email!,
          guestName: updated.guest_name ?? "ゲスト",
          date: updated.date,
          startTime: updated.start_time.slice(0, 5),
          endTime: updated.end_time.slice(0, 5),
          totalPrice: updated.total_price,
          options: optionList,
          reservationId: updated.id,
          companyName: updated.billing_type === "corporate" ? updated.company_name : null,
        });

        if (!sent) {
          console.error("confirmReservation: email failed", {
            reservationId: updated.id,
            to: updated.guest_email,
          });
        }
      } catch (err) {
        console.error("confirmReservation: email error", {
          reservationId: updated.id,
          to: updated.guest_email,
          error: err,
        });
      }
    })();
  }

  return { ok: true, reservationId: updated.id, alreadyConfirmed: false };
}
