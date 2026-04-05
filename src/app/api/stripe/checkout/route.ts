import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/google-calendar";
import { parseCheckoutBody } from "@/lib/checkout-validation";
import { timeToMinutes } from "@/lib/time-utils";
import { CURRENCY, RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { NextRequest } from "next/server";

type AvailabilityRule =
  Database["public"]["Tables"]["availability_rules"]["Row"];

/**
 * POST /api/stripe/checkout
 *
 * 予約を pending で作成し、Stripe Checkout Session を返す。
 */
export async function POST(request: NextRequest) {
  const parsed = parseCheckoutBody(await request.json());
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { date, startTime, endTime, optionIds, guestEmail, guestName } =
    parsed.data;

  const supabase = createAdminClient();

  // 曜日から営業ルールを取得
  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .returns<AvailabilityRule[]>();

  if (!rules || rules.length === 0) {
    return Response.json({ error: "この日は予約できません" }, { status: 400 });
  }

  const rule = rules[0];
  const pricingType = rule.pricing_type;

  // 空き確認: Google カレンダーのみ（Phase 6 で Supabase も統合予定）
  const calendarEvents = await getCalendarEvents(date);
  const bookedRanges = calendarEvents
    .filter((e) => !e.isAllDay)
    .map((e) => ({ start: e.startTime, end: e.endTime }));
  const hasAllDay = calendarEvents.some((e) => e.isAllDay);

  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);
  const hasConflict =
    hasAllDay ||
    bookedRanges.some(
      (r) => timeToMinutes(r.start) < reqEnd && timeToMinutes(r.end) > reqStart
    );

  if (hasConflict) {
    return Response.json(
      { error: "選択した時間帯は既に予約されています" },
      { status: 409 }
    );
  }

  // 料金計算（整数保証）
  let basePrice: number;
  if (pricingType === "daily") {
    basePrice = rule.price_per_slot;
  } else {
    const hours = Math.round((reqEnd - reqStart) / 60);
    basePrice = rule.price_per_slot * hours;
  }

  // オプション取得
  let selectedOptions: { id: string; name: string; price: number }[] = [];
  if (optionIds.length > 0) {
    const { data } = await supabase
      .from("options")
      .select("id, name, price")
      .in("id", optionIds)
      .eq("is_active", true);
    selectedOptions = data ?? [];
  }

  const optionsPrice = selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const totalPrice = basePrice + optionsPrice;

  // 予約を pending で作成
  const { data: reservation, error: insertError } = await supabase
    .from("reservations")
    .insert({
      guest_email: guestEmail,
      guest_name: guestName,
      date,
      start_time: startTime,
      end_time: endTime,
      status: "pending",
      source: "web",
      base_price: basePrice,
      total_price: totalPrice,
    })
    .select("id")
    .single();

  if (insertError || !reservation) {
    console.error("Reservation insert error:", insertError);
    return Response.json(
      { error: "予約の作成に失敗しました" },
      { status: 500 }
    );
  }

  // オプションを中間テーブルに挿入
  if (selectedOptions.length > 0) {
    await supabase.from("reservation_options").insert(
      selectedOptions.map((o) => ({
        reservation_id: reservation.id,
        option_id: o.id,
        quantity: 1,
        price_at_booking: o.price,
      }))
    );
  }

  // Stripe Checkout Session 作成（失敗時は予約をキャンセル）
  try {
    const lineItems = [
      {
        price_data: {
          currency: CURRENCY,
          product_data: {
            name:
              pricingType === "daily"
                ? `スペース利用（丸一日）${date}`
                : `スペース利用 ${date} ${startTime}-${endTime}`,
          },
          unit_amount: basePrice,
        },
        quantity: 1,
      },
      ...selectedOptions.map((o) => ({
        price_data: {
          currency: CURRENCY,
          product_data: { name: o.name },
          unit_amount: o.price,
        },
        quantity: 1,
      })),
    ];

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: guestEmail,
      metadata: { reservation_id: reservation.id },
      success_url: `${siteUrl}/reserve/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/reserve?cancelled=true`,
      expires_at:
        Math.floor(Date.now() / 1000) + RESERVATION_EXPIRY_MINUTES * 60,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    // Stripe 失敗時は予約をキャンセルして孤児データを防ぐ
    await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation.id);
    return Response.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
