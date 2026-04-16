import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendReservationConfirmation } from "@/lib/email";

type ReservationInput = {
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
  options: { id: string; name: string; price: number }[];
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
};

type ConfirmResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

/**
 * 予約レコードを confirmed で新規作成し、Google カレンダー作成 + 確認メール送信を行う。
 * Stripe Webhook の checkout.session.completed から呼ばれる。
 *
 * メール送信は Webhook の応答を遅らせないよう fire-and-forget で実行する。
 */
export async function confirmReservation(
  input: ReservationInput,
): Promise<ConfirmResult> {
  const supabase = createAdminClient();

  // 1. 予約レコードを confirmed で作成
  const { data: reservation, error: insertError } = await supabase
    .from("reservations")
    .insert({
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      guest_email: input.guestEmail,
      guest_name: input.guestName,
      base_price: input.basePrice,
      total_price: input.totalPrice,
      billing_type: input.billingType,
      company_name: input.companyName,
      company_department: input.companyDepartment,
      contact_person_name: input.contactPersonName,
      usage_purpose: input.usagePurpose,
      status: "confirmed",
      source: "web",
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.stripeCheckoutSessionId
        ? { stripe_checkout_session_id: input.stripeCheckoutSessionId }
        : {}),
      ...(input.stripePaymentIntentId
        ? { stripe_payment_intent_id: input.stripePaymentIntentId }
        : {}),
    })
    .select("id")
    .single();

  if (insertError || !reservation) {
    console.error("confirmReservation: insert failed:", insertError);
    return { ok: false, error: "予約の作成に失敗しました" };
  }

  // 2. オプションを中間テーブルに挿入
  if (input.options.length > 0) {
    const { error: optError } = await supabase
      .from("reservation_options")
      .insert(
        input.options.map((o) => ({
          reservation_id: reservation.id,
          option_id: o.id,
          quantity: 1,
          price_at_booking: o.price,
        }))
      );
    if (optError) {
      console.error("confirmReservation: options insert failed:", optError);
    }
  }

  // 3. Google カレンダーにイベント作成
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://localhost:3000");

  const isCorporate = input.billingType === "corporate" && !!input.companyName;
  const optionLines = input.options.map(
    (o) => `  - ${o.name} ×1（¥${o.price.toLocaleString()}）`,
  );

  const eventId = await createCalendarEvent({
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    summary: "オーナー利用",
    description: [
      ...(isCorporate ? [`法人: ${input.companyName}`] : []),
      `名前: ${input.guestName}`,
      `メール: ${input.guestEmail}`,
      `予約時間: ${input.startTime}-${input.endTime}`,
      ...(optionLines.length > 0
        ? ["", "オプション:", ...optionLines]
        : []),
      "",
      `${siteUrl}/admin/reservations/${reservation.id}`,
    ].join("\n"),
  });

  if (eventId) {
    await supabase
      .from("reservations")
      .update({ google_event_id: eventId })
      .eq("id", reservation.id);
  } else {
    console.error(
      "confirmReservation: Google Calendar event creation failed",
      { reservationId: reservation.id },
    );
  }

  // 4. 確認メール送信（fire-and-forget: Webhook 応答を遅らせない）
  if (input.guestEmail) {
    void (async () => {
      try {
        const sent = await sendReservationConfirmation({
          to: input.guestEmail,
          guestName: input.guestName,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          totalPrice: input.totalPrice,
          options: input.options.map((o) => ({
            name: o.name,
            quantity: 1,
            price: o.price,
          })),
          reservationId: reservation.id,
          companyName: isCorporate ? input.companyName : null,
        });

        if (!sent) {
          console.error("confirmReservation: email failed", {
            reservationId: reservation.id,
            to: input.guestEmail,
          });
        }
      } catch (err) {
        console.error("confirmReservation: email error", {
          reservationId: reservation.id,
          to: input.guestEmail,
          error: err,
        });
      }
    })();
  }

  return { ok: true, reservationId: reservation.id };
}

type ConfirmPendingResult =
  | { ok: true; reservationId: string; alreadyConfirmed: boolean }
  | { ok: false; error: string };

/**
 * 既存の pending 予約を confirmed に更新し、Google カレンダー作成 + 確認メール送信を行う。
 * 管理画面の手動確定で使用する。
 */
export async function confirmPendingReservation(
  reservationId: string,
): Promise<ConfirmPendingResult> {
  const supabase = createAdminClient();

  const { data: updated, error } = await supabase
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", reservationId)
    .eq("status", "pending")
    .select(
      "id, date, start_time, end_time, guest_name, guest_email, google_event_id, total_price, billing_type, company_name",
    )
    .maybeSingle();

  if (error) {
    console.error("confirmPendingReservation: DB update failed:", error);
    return { ok: false, error: "DB update failed" };
  }

  if (!updated) {
    return { ok: true, reservationId, alreadyConfirmed: true };
  }

  const needsCalendar = !updated.google_event_id;
  const needsEmail = !!updated.guest_email;

  let optionList: { name: string; quantity: number; price: number }[] = [];
  if (needsCalendar || needsEmail) {
    const { data: resOptions, error: optionsError } = await supabase
      .from("reservation_options")
      .select("quantity, price_at_booking, option:options(name)")
      .eq("reservation_id", updated.id);

    if (optionsError) {
      console.error("confirmPendingReservation: options fetch failed:", {
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

  if (needsCalendar) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://localhost:3000");
    const optionLines = optionList.map(
      (o) => `  - ${o.name} ×${o.quantity}（¥${o.price.toLocaleString()}）`,
    );
    const isCorporate = updated.billing_type === "corporate" && !!updated.company_name;

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
        ...(optionLines.length > 0 ? ["", "オプション:", ...optionLines] : []),
        "",
        `${siteUrl}/admin/reservations/${updated.id}`,
      ].join("\n"),
    });

    if (eventId) {
      await supabase
        .from("reservations")
        .update({ google_event_id: eventId })
        .eq("id", updated.id);
    }
  }

  if (needsEmail) {
    void (async () => {
      try {
        await sendReservationConfirmation({
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
      } catch (err) {
        console.error("confirmPendingReservation: email error", err);
      }
    })();
  }

  return { ok: true, reservationId: updated.id, alreadyConfirmed: false };
}
