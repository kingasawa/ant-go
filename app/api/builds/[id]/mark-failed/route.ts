/**
 * POST /api/builds/[id]/mark-failed
 * Force build status to failed (dùng admin SDK để bypass Firestore rules)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ref = getAdminDb().collection(BUILDS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }
    await ref.update({
      status:       "failed",
      step:         "error",
      errorMessage: "Build bị huỷ thủ công.",
      completedAt:  new Date().toISOString(),
      updatedAt:    FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[POST /api/builds/${id}/mark-failed]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

