/**
 * POST /api/builds/[id]/rebuild
 * Reset build status về pending để Mac server nhận lại job
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

    // Xoá toàn bộ logs subcollection
    const logsSnap = await ref.collection("logs").get();
    if (!logsSnap.empty) {
      const batch = getAdminDb().batch();
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await ref.update({
      status:      "pending",
      step:        FieldValue.delete(),
      errorMessage: FieldValue.delete(),
      completedAt:  FieldValue.delete(),
      startedAt:    FieldValue.delete(),
      updatedAt:    FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[POST /api/builds/${id}/rebuild]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

