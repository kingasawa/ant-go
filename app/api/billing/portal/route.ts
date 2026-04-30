/**
 * POST /api/billing/portal
 * Auth: Firebase ID token in Authorization: Bearer <token>
 *
 * Creates a Stripe Customer Portal session and returns the redirect URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  const customerId = userDoc.data()?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/account/billing`,
  });

  return NextResponse.json({ url: session.url });
}
