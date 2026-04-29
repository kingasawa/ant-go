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
  const { projectId, source } = body;

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

  // Derive base URL from request so it works in both local and production
  const reqUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
  const enrollUrl = `${baseUrl}/api/device-enroll/${token}/profile`;

  return NextResponse.json({ token, enrollUrl }, { status: 201 });
}
