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
import { FieldValue } from "firebase-admin/firestore";

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
  const errors: string[] = [];

  // ── 1. Stuck at "uploading" ───────────────────────────────────────────────
  // Không dùng composite query — filter bằng JS để tránh cần Firestore index
  let uploadingCount = 0;
  try {
    const uploadingSnap = await db
      .collection(BUILDS_COLLECTION)
      .where("status", "==", "uploading")
      .get();

    const uploadingCutoff = now - TIMEOUT_UPLOADING_MS;
    for (const doc of uploadingSnap.docs) {
      const createdAt = doc.data().createdAt?.toMillis?.() ?? 0;
      if (createdAt > uploadingCutoff) continue;
      await doc.ref.set({
        status:       "failed",
        step:         "error",
        errorMessage: "Build timed out during upload — CLI may have crashed or lost connection.",
        updatedAt:    FieldValue.serverTimestamp(),
      }, { merge: true });
      failed++;
      uploadingCount++;
      console.log(`[cleanup-builds] UPLOADING timeout → failed: ${doc.id}`);
    }
  } catch (err: any) {
    const msg = `uploading query failed: ${err.message}`;
    console.error(`[cleanup-builds] ${msg}`);
    errors.push(msg);
  }

  // ── 2. Stuck at "pending" ─────────────────────────────────────────────────
  let pendingCount = 0;
  try {
    const pendingSnap = await db
      .collection(BUILDS_COLLECTION)
      .where("status", "==", "pending")
      .get();

    const pendingCutoff = now - TIMEOUT_PENDING_MS;
    for (const doc of pendingSnap.docs) {
      const updatedAt = doc.data().updatedAt?.toMillis?.() ?? 0;
      if (updatedAt > pendingCutoff) continue;
      await doc.ref.set({
        status:       "failed",
        step:         "error",
        errorMessage: "Build timed out waiting for build server — no server picked up the job.",
        updatedAt:    FieldValue.serverTimestamp(),
      }, { merge: true });
      failed++;
      pendingCount++;
      console.log(`[cleanup-builds] PENDING timeout → failed: ${doc.id}`);
    }
  } catch (err: any) {
    const msg = `pending query failed: ${err.message}`;
    console.error(`[cleanup-builds] ${msg}`);
    errors.push(msg);
  }

  // ── 3. Stuck at "in_progress" (no heartbeat) ─────────────────────────────
  let inProgressCount = 0;
  try {
    const inProgressSnap = await db
      .collection(BUILDS_COLLECTION)
      .where("status", "==", "in_progress")
      .get();

    const heartbeatCutoff = now - TIMEOUT_HEARTBEAT_MS;
    for (const doc of inProgressSnap.docs) {
      const lastHeartbeat = doc.data().lastHeartbeat?.toMillis?.() ?? 0;
      if (lastHeartbeat > heartbeatCutoff) continue;
      await doc.ref.set({
        status:       "failed",
        step:         "error",
        errorMessage: "Build server stopped responding (no heartbeat for 30 minutes). The server may have crashed.",
        updatedAt:    FieldValue.serverTimestamp(),
      }, { merge: true });
      failed++;
      inProgressCount++;
      console.log(`[cleanup-builds] IN_PROGRESS heartbeat lost → failed: ${doc.id}`);
    }
  } catch (err: any) {
    const msg = `in_progress query failed: ${err.message}`;
    console.error(`[cleanup-builds] ${msg}`);
    errors.push(msg);
  }

  console.log(`[cleanup-builds] Done. Marked ${failed} stuck build(s) as failed.`);

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, failed, errors }, { status: 500 });
  }

  return NextResponse.json({
    ok:     true,
    failed,
    detail: {
      uploading:  uploadingCount,
      pending:    pendingCount,
      inProgress: inProgressCount,
    },
  });
}

