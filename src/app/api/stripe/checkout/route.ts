import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCalendarEvents } from "@/lib/google-calendar";
import { parseCheckoutBody } from "@/lib/checkout-validation";
import { timeToMinutes } from "@/lib/time-utils";
import { getEffectiveDayOfWeek } from "@/lib/date-utils";
import { CURRENCY, RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { NextRequest } from "next/server";

type AvailabilityRule =
  Database["public"]["Tables"]["availability_rules"]["Row"];

/**
 * POST /api/stripe/checkout
 *
 * 予約情報を Stripe metadata に格納し、Checkout Session を返す。
 * 予約レコードは決済完了後に Webhook で作成する。
 */
export async function POST(request: NextRequest) {
  const parsed = parseCheckoutBody(await request.json());
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const {
    date, startTime, endTime, optionIds, guestEmail, guestName,
    billingType, companyName, companyDepartment, contactPersonName, usagePurpose,
  } = parsed.data;

  // user_id はクライアントから受け取らず、サーバーセッションから取得
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  const supabase = createAdminClient();

  // 曜日から営業ルールを取得（祝日は日曜扱い）
  const dayOfWeek = getEffectiveDayOfWeek(date);
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

  // 空き確認: Google カレンダー
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

  // Stripe Checkout Session 作成（予約情報は metadata に格納）
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

  const origin = request.headers.get("origin") || request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: guestEmail,
      metadata: {
        date,
        start_time: startTime,
        end_time: endTime,
        guest_email: guestEmail,
        guest_name: guestName,
        base_price: String(basePrice),
        total_price: String(totalPrice),
        billing_type: billingType,
        ...(companyName ? { company_name: companyName } : {}),
        ...(companyDepartment ? { company_department: companyDepartment } : {}),
        ...(contactPersonName ? { contact_person_name: contactPersonName } : {}),
        ...(usagePurpose ? { usage_purpose: usagePurpose } : {}),
        ...(userId ? { user_id: userId } : {}),
        ...(selectedOptions.length > 0
          ? { option_ids: selectedOptions.map((o) => o.id).join(",") }
          : {}),
      },
      success_url: `${origin}/reserve/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/reserve?cancelled=true`,
      expires_at:
        Math.floor(Date.now() / 1000) + RESERVATION_EXPIRY_MINUTES * 60,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    return Response.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
