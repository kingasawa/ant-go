/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events to sync subscription state into Firestore.
 * Events handled:
 *   - checkout.session.completed     → activate plan
 *   - customer.subscription.updated  → update plan/status
 *   - customer.subscription.deleted  → downgrade to free
 *   - invoice.payment_failed         → mark plan as past_due
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getAdminDb();

  const planByPrice: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: "starter",
    [process.env.STRIPE_PRO_PRICE_ID!]:     "pro",
    [process.env.STRIPE_TEAM_PRICE_ID!]:    "team",
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUid;
      const plan = session.metadata?.plan;
      if (!uid || !plan) break;

      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subId = typeof session.subscription === "string" ? session.subscription : null;

      await db.collection("users").doc(uid).update({
        plan,
        planStatus: "active",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        updatedAt: new Date(),
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUid;
      if (!uid) break;

      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = planByPrice[priceId] ?? "free";

      await db.collection("users").doc(uid).update({
        plan: sub.status === "active" ? plan : "free",
        planStatus: sub.status,
        stripeSubscriptionId: sub.id,
        updatedAt: new Date(),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUid;
      if (!uid) break;

      await db.collection("users").doc(uid).update({
        plan: "free",
        planStatus: "canceled",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (!customerId) break;

      const snap = await db
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!snap.empty) {
        await snap.docs[0].ref.update({ planStatus: "past_due", updatedAt: new Date() });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
