import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

/**
 * POST /api/stripe/webhook
 *
 * Stripe Webhook ハンドラ。
 * checkout.session.completed → 予約を confirmed に
 * checkout.session.expired → 予約を cancelled に
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

      await supabase
        .from("reservations")
        .update({
          status: "confirmed",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .eq("id", reservationId);

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const reservationId = session.metadata?.reservation_id;
      if (!reservationId) break;

      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId)
        .eq("status", "pending");

      break;
    }
  }

  return Response.json({ received: true });
}
