/**
 * POST /api/device-enroll/create
 * Body: { projectId: string }
 *
 * Creates a device enrollment session in Firestore.
 * Returns: { token, enrollUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { projectId, source, origin } = body;

  const token = randomUUID();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const db = getAdminDb();
  await db.collection("device_enrollments").doc(token).set({
    projectId: typeof projectId === "string" ? projectId.trim() : null,
    source: source ?? "cli",
    status: "pending",
    createdAt: now,
    expiresAt,
    udid: null,
    deviceProduct: null,
    deviceSerial: null,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (typeof origin === "string" && origin.startsWith("http") ? origin : null)
    || (() => { const u = new URL(request.url); return `${u.protocol}//${u.host}`; })();
  const enrollUrl = `${baseUrl}/api/device-enroll/${token}/profile`;

  return NextResponse.json({ token, enrollUrl }, { status: 201 });
}
