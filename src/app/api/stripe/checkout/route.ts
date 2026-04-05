import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/google-calendar";
import { CURRENCY, RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { NextRequest } from "next/server";

type AvailabilityRule = Database["public"]["Tables"]["availability_rules"]["Row"];
type Reservation = Pick<Database["public"]["Tables"]["reservations"]["Row"], "start_time" | "end_time">;
type OptionRow = Database["public"]["Tables"]["options"]["Row"];

type CheckoutRequest = {
  date: string;
  startTime: string;
  endTime: string;
  optionIds: string[];
  guestEmail?: string;
  guestName?: string;
};

/**
 * POST /api/stripe/checkout
 *
 * 予約を pending で作成し、Stripe Checkout Session を返す。
 */
export async function POST(request: NextRequest) {
  const body: CheckoutRequest = await request.json();
  const { date, startTime, endTime, optionIds, guestEmail, guestName } = body;

  if (!date || !startTime || !endTime) {
    return Response.json(
      { error: "date, startTime, endTime は必須です" },
      { status: 400 }
    );
  }

  if (!guestEmail || !guestName) {
    return Response.json(
      { error: "guestEmail, guestName は必須です" },
      { status: 400 }
    );
  }

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

  // 空き確認: DB + Google カレンダー
  const [{ data: existingReservations }, calendarEvents] = await Promise.all([
    supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("date", date)
      .in("status", ["pending", "confirmed"])
      .returns<Reservation[]>(),
    getCalendarEvents(date),
  ]);

  const bookedRanges = [
    ...(existingReservations ?? []).map((r) => ({
      start: r.start_time as string,
      end: r.end_time as string,
    })),
    ...calendarEvents
      .filter((e) => !e.isAllDay)
      .map((e) => ({ start: e.startTime, end: e.endTime })),
  ];

  const hasAllDay = calendarEvents.some((e) => e.isAllDay);

  // 要求時間帯と既存予約の重複チェック
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

  // 料金計算
  let basePrice: number;
  if (pricingType === "daily") {
    basePrice = rule.price_per_slot;
  } else {
    const hours = (reqEnd - reqStart) / 60;
    basePrice = rule.price_per_slot * hours;
  }

  // オプション取得
  const { data: selectedOptions } = await supabase
    .from("options")
    .select("*")
    .in("id", optionIds.length > 0 ? optionIds : ["__none__"])
    .eq("is_active", true)
    .returns<OptionRow[]>();

  const optionsPrice = (selectedOptions ?? []).reduce(
    (sum, o) => sum + o.price,
    0
  );
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
  if (selectedOptions && selectedOptions.length > 0) {
    await supabase.from("reservation_options").insert(
      selectedOptions.map((o) => ({
        reservation_id: reservation.id,
        option_id: o.id,
        quantity: 1,
        price_at_booking: o.price,
      }))
    );
  }

  // Stripe Checkout Session 作成
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
    ...(selectedOptions ?? []).map((o) => ({
      price_data: {
        currency: CURRENCY,
        product_data: { name: o.name },
        unit_amount: o.price,
      },
      quantity: 1,
    })),
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: guestEmail,
    metadata: { reservation_id: reservation.id },
    success_url: `${siteUrl}/reserve/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/reserve?cancelled=true`,
    expires_at: Math.floor(Date.now() / 1000) + RESERVATION_EXPIRY_MINUTES * 60,
  });

  return Response.json({ url: session.url });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
