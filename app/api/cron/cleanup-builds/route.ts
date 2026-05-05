/**
 * GET /api/cron/cleanup-builds
 *
 * Tìm và fail các build bị stuck ở các trạng thái trung gian:
 *   - "uploading"   > 1 giờ   → CLI crash / network fail / không gọi /start
 *   - "pending"     > 2 giờ   → Mac server không pick up
 *   - "in_progress" không có heartbeat > 30 phút → Mac server chết giữa chừng
 *
 * Auth: header `x-cron-secret: <CRON_SECRET>`
 *
 * Đăng ký GCP Cloud Scheduler:
 *   Schedule: * /15 * * * *  (mỗi 15 phút)
 *   URL: https://<domain>/api/cron/cleanup-builds
 *   Header: x-cron-secret: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

const TIMEOUT_UPLOADING_MS  = 60 * 60 * 1000;       // 1 giờ
const TIMEOUT_PENDING_MS    = 2 * 60 * 60 * 1000;   // 2 giờ
const TIMEOUT_HEARTBEAT_MS  = 30 * 60 * 1000;       // 30 phút

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db  = getAdminDb();
  const now = Date.now();
  let failed = 0;

  // ── 1. Stuck at "uploading" ───────────────────────────────────────────────
  const uploadingCutoff = Timestamp.fromMillis(now - TIMEOUT_UPLOADING_MS);
  const uploadingSnap = await db
    .collection(BUILDS_COLLECTION)
    .where("status", "==", "uploading")
    .where("createdAt", "<=", uploadingCutoff)
    .get();

  for (const doc of uploadingSnap.docs) {
    await doc.ref.set({
      status:       "failed",
      step:         "error",
      errorMessage: "Build timed out during upload — CLI may have crashed or lost connection.",
      updatedAt:    FieldValue.serverTimestamp(),
    }, { merge: true });
    failed++;
    console.log(`[cleanup-builds] UPLOADING timeout → failed: ${doc.id}`);
  }

  // ── 2. Stuck at "pending" ─────────────────────────────────────────────────
  const pendingCutoff = Timestamp.fromMillis(now - TIMEOUT_PENDING_MS);
  const pendingSnap = await db
    .collection(BUILDS_COLLECTION)
    .where("status", "==", "pending")
    .where("updatedAt", "<=", pendingCutoff)
    .get();

  for (const doc of pendingSnap.docs) {
    await doc.ref.set({
      status:       "failed",
      step:         "error",
      errorMessage: "Build timed out waiting for build server — no server picked up the job.",
      updatedAt:    FieldValue.serverTimestamp(),
    }, { merge: true });
    failed++;
    console.log(`[cleanup-builds] PENDING timeout → failed: ${doc.id}`);
  }

  // ── 3. Stuck at "in_progress" (no heartbeat) ─────────────────────────────
  const heartbeatCutoff = Timestamp.fromMillis(now - TIMEOUT_HEARTBEAT_MS);
  const inProgressSnap = await db
    .collection(BUILDS_COLLECTION)
    .where("status", "==", "in_progress")
    .where("lastHeartbeat", "<=", heartbeatCutoff)
    .get();

  for (const doc of inProgressSnap.docs) {
    await doc.ref.set({
      status:       "failed",
      step:         "error",
      errorMessage: "Build server stopped responding (no heartbeat for 30 minutes). The server may have crashed.",
      updatedAt:    FieldValue.serverTimestamp(),
    }, { merge: true });
    failed++;
    console.log(`[cleanup-builds] IN_PROGRESS heartbeat lost → failed: ${doc.id}`);
  }

  console.log(`[cleanup-builds] Done. Marked ${failed} stuck build(s) as failed.`);
  return NextResponse.json({
    ok:     true,
    failed,
    detail: {
      uploading:  uploadingSnap.size,
      pending:    pendingSnap.size,
      inProgress: inProgressSnap.size,
    },
  });
}

