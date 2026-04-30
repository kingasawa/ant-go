/**
 * POST /api/billing/checkout
 * Body: { plan: "starter" | "pro" | "team" }
 * Auth: Firebase ID token in Authorization: Bearer <token>
 *
 * Creates a Stripe Checkout session and returns the redirect URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

async function resolveUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

function getPriceId(plan: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro:     process.env.STRIPE_PRO_PRICE_ID,
    team:    process.env.STRIPE_TEAM_PRICE_ID,
  };
  return map[plan] ?? null;
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { plan } = body;

  const priceId = getPriceId(plan);
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const stripe = getStripe();
  const db = getAdminDb();

  const userDoc = await db.collection("users").doc(user.uid).get();
  let customerId: string | undefined = userDoc.data()?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { firebaseUid: user.uid },
    });
    customerId = customer.id;
    await db.collection("users").doc(user.uid).update({ stripeCustomerId: customerId });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account/billing?success=1`,
    cancel_url:  `${baseUrl}/account/billing?canceled=1`,
    metadata: { firebaseUid: user.uid, plan },
    subscription_data: { metadata: { firebaseUid: user.uid, plan } },
  });

  return NextResponse.json({ url: session.url });
}
