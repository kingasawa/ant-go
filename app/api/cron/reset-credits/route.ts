/**
 * GET /api/cron/reset-credits
 *
 * Reset credit cho tất cả user đã qua ngày reset (creditsResetAt <= now).
 * Auth: header `x-cron-secret: <CRON_SECRET>`
 *
 * Đăng ký GCP Cloud Scheduler:
 *   Schedule: 0 0 1 * *  (00:00 ngày 1 mỗi tháng, Asia/Ho_Chi_Minh)
 *   URL: https://<domain>/api/cron/reset-credits
 *   Header: x-cron-secret: <CRON_SECRET>
 *
 * Idempotent — transaction check creditsResetAt trước khi reset.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[reset-credits] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();

  // Query users có creditsResetAt <= now
  const usersSnap = await db
    .collection("users")
    .where("creditsResetAt", "<=", now)
    .get();

  if (usersSnap.empty) {
    return NextResponse.json({ ok: true, reset: 0 });
  }

  // Batch update — Firestore giới hạn 500 ops/batch
  const BATCH_SIZE = 400;
  const docs = usersSnap.docs;
  let resetCount = 0;
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);

    for (const docSnap of chunk) {
      const data = docSnap.data();
      const planCredits: number = data.planCredits ?? 15;

      // Double-check trong batch (idempotent)
      const resetAt: Date | null = data.creditsResetAt?.toDate?.() ?? null;
      if (resetAt && resetAt > now) continue; // đã được reset bởi lazy reset

      batch.update(docSnap.ref, {
        credits: planCredits === -1 ? -1 : planCredits,
        creditsResetAt: nextReset,
        updatedAt: FieldValue.serverTimestamp(),
      });
      resetCount++;
    }

    await batch.commit();
  }

  console.log(`[reset-credits] Reset ${resetCount}/${docs.length} users at ${now.toISOString()}`);
  return NextResponse.json({ ok: true, reset: resetCount, total: docs.length });
}

