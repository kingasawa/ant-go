/**
 * POST /api/device-enroll/create
 * Body: { projectId?, source?, origin? }
 *
 * Creates a device enrollment session in Firestore.
 * Returns: { token, enrollUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { validateCliToken } from "@/lib/cli-auth.service";
import { randomUUID } from "crypto";

async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {}
  const session = await validateCliToken(token);
  return session?.uid ?? null;
}

export async function POST(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { projectId, source, origin } = body;

  const token = randomUUID();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const db = getAdminDb();
  await db.collection("device_enrollments").doc(token).set({
    userId: uid,
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
