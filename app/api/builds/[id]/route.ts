/**
 * GET /api/builds/[id]
 * Trả về trạng thái build job từ Firestore
 *
 * DELETE /api/builds/[id]
 * Xoá build + toàn bộ logs subcollection
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const snap = await getAdminDb().collection(BUILDS_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Build job not found" }, { status: 404 });
    }
    const d = snap.data()!;
    return NextResponse.json({
      jobId:        id,
      status:       d.status        ?? null,
      step:         d.step          ?? null,
      appName:      d.appName       ?? null,
      ipaUrl:       d.ipaUrl        ?? null,
      dsymUrl:      d.dsymUrl       ?? null,
      error:        d.errorMessage  ?? d.error ?? null,
      schemeName:   d.schemeName    ?? null,
      bundleId:     d.bundleId      ?? null,
      createdAt:    d.createdAt?.toDate().toISOString() ?? null,
      updatedAt:    d.updatedAt?.toDate().toISOString() ?? null,
    });
  } catch (err: any) {
    console.error(`[GET /api/builds/${id}]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db  = getAdminDb();
    const ref = db.collection(BUILDS_COLLECTION).doc(id);

    if (!(await ref.get()).exists) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // Xoá logs subcollection (batch tối đa 500 docs/lần)
    let logsSnap = await ref.collection("logs").limit(500).get();
    while (!logsSnap.empty) {
      const batch = db.batch();
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      logsSnap = await ref.collection("logs").limit(500).get();
    }

    // Xoá build document
    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[DELETE /api/builds/${id}]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

