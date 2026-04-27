/**
 * GET /api/device-enroll/[token]/status
 *
 * CLI polls this endpoint to check if the iPhone has submitted its UDID.
 * Returns: { status: "pending" | "registered" | "expired", udid?, deviceProduct?, deviceSerial? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const db = getAdminDb();
  const doc = await db.collection("device_enrollments").doc(token).get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Token không hợp lệ" }, { status: 404 });
  }

  const data = doc.data()!;

  if (Date.now() > data.expiresAt && data.status === "pending") {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({
    status: data.status,
    udid: data.udid ?? null,
    deviceProduct: data.deviceProduct ?? null,
    deviceSerial: data.deviceSerial ?? null,
  });
}
