/**
 * POST /api/builds/:id/complete
 *
 * Endpoint dành cho Mac build server gọi khi build kết thúc.
 * Auth: header `x-internal-secret: <INTERNAL_BUILD_SECRET>`
 *
 * Body: { status: "success" | "failed", durationMs: number }
 *
 * Flow:
 * 1. Validate INTERNAL_BUILD_SECRET
 * 2. Đọc build doc → lấy userId
 * 3. Cập nhật builds/{id}: status, completedAt, durationMs
 * 4. Gọi deductCredit(userId, id, status, durationMs)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { deductCredit } from "@/lib/credit.service";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: INTERNAL_BUILD_SECRET
  const secret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_BUILD_SECRET;

  if (!expectedSecret) {
    console.error("[complete] INTERNAL_BUILD_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: buildId } = await params;
  if (!buildId) {
    return NextResponse.json({ error: "Build ID is required" }, { status: 400 });
  }

  let body: { status?: string; durationMs?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, durationMs } = body;

  if (status !== "success" && status !== "failed") {
    return NextResponse.json({ error: 'status phải là "success" hoặc "failed"' }, { status: 400 });
  }
  if (typeof durationMs !== "number" || durationMs < 0) {
    return NextResponse.json({ error: "durationMs phải là số dương" }, { status: 400 });
  }

  const db = getAdminDb();
  const buildRef = db.collection("builds").doc(buildId);

  // Đọc build doc để lấy userId
  const buildSnap = await buildRef.get();
  if (!buildSnap.exists) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  const buildData = buildSnap.data()!;
  const userId: string | undefined = buildData.userId;

  if (!userId) {
    return NextResponse.json({ error: "Build has no userId" }, { status: 500 });
  }

  // Cập nhật build document
  await buildRef.update({
    status,
    completedAt: FieldValue.serverTimestamp(),
    durationMs,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Trừ credit (best-effort — không fail request nếu lỗi credit)
  try {
    await deductCredit(userId, buildId, status, durationMs);
  } catch (err) {
    console.error(`[complete] deductCredit failed for build=${buildId} user=${userId}:`, err);
    // Không trả lỗi — build đã được cập nhật thành công
  }

  return NextResponse.json({ ok: true });
}


