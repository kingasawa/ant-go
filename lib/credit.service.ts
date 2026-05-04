/**
 * credit.service.ts — Logic quản lý credit cho build
 *
 * Tất cả đọc/ghi đều dùng Admin SDK để tránh client giả mạo.
 *
 * Credit deduction rules:
 *   - Build thành công:        -1
 *   - Build thất bại < 3 min:  -0.2
 *   - Build thất bại ≥ 3 min:  -0.4
 *   - Enterprise (planCredits === -1): không trừ
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { PLAN_CREDITS } from "@/lib/createUserProfile";
import { FieldValue } from "firebase-admin/firestore";

const THREE_MINUTES_MS = 3 * 60 * 1000;

/** Tính ngày 1 đầu tháng tiếp theo */
export function nextMonthFirstDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Tính số credit cần trừ.
 * Trả về số âm (VD: -1, -0.2, -0.4) hoặc 0 nếu unlimited.
 */
export function calcCreditDeduction(
  status: "success" | "failed",
  durationMs: number,
  planCredits: number
): number {
  // Enterprise / unlimited plan → không trừ
  if (planCredits === -1) return 0;

  if (status === "success") return -1;
  if (durationMs < THREE_MINUTES_MS) return -0.2;
  return -0.4;
}

/**
 * Lazy-reset credit nếu creditsResetAt đã qua (đầu tháng mới).
 * Dùng Firestore transaction để tránh race condition.
 * Safe to call nhiều lần — idempotent.
 */
export async function checkAndResetCredits(uid: string): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return;

    const data = snap.data()!;
    const resetAt: Date | null = data.creditsResetAt?.toDate?.() ?? null;

    if (!resetAt || new Date() < resetAt) return; // chưa đến ngày reset

    const planCredits: number = data.planCredits ?? PLAN_CREDITS[data.plan ?? "free"] ?? 15;
    const now = new Date();
    // Tính ngày 1 tháng tiếp theo từ thời điểm hiện tại
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    tx.update(userRef, {
      credits: planCredits === -1 ? -1 : planCredits,
      creditsResetAt: nextReset,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Trừ credit sau khi build kết thúc.
 * Dùng Firestore transaction: đọc balance → tính amount → ghi creditHistory → update credits.
 * Nếu planCredits === -1 (enterprise), không ghi creditHistory và không trừ.
 */
export async function deductCredit(
  uid: string,
  buildId: string,
  status: "success" | "failed",
  durationMs: number
): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const historyRef = db.collection("users").doc(uid).collection("creditHistory").doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return;

    const data = snap.data()!;
    const planCredits: number = data.planCredits ?? PLAN_CREDITS[data.plan ?? "free"] ?? 15;

    const amount = calcCreditDeduction(status, durationMs, planCredits);
    if (amount === 0) return; // unlimited plan, không trừ

    const balanceBefore: number = data.credits ?? 0;
    const balanceAfter = Math.max(0, balanceBefore + amount); // không để âm

    const reason =
      status === "success"
        ? "success"
        : durationMs < THREE_MINUTES_MS
        ? "failed_fast"
        : "failed_slow";

    tx.set(historyRef, {
      buildId,
      amount,
      reason,
      balanceBefore,
      balanceAfter,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(userRef, {
      credits: balanceAfter,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

