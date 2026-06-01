/**
 * POST /api/builds/[id]/retry-submit
 *
 * Cho phép user retry bước submit TestFlight mà không cần rebuild IPA.
 * Chỉ hoạt động khi build có status = "submit_failed" và có ipaPath.
 *
 * Mac server lắng nghe status = "submit_pending" và chạy lại submit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db  = getAdminDb();
    const ref = db.collection(BUILDS_COLLECTION).doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    const data = snap.data()!;

    // Chỉ retry khi build đã có IPA và bị fail ở bước submit
    if (data.status !== "submit_failed") {
      return NextResponse.json(
        { error: `Cannot retry submit: build status is "${data.status}", expected "submit_failed"` },
        { status: 400 }
      );
    }

    if (!data.ipaPath) {
      return NextResponse.json(
        { error: "IPA not found — cannot retry submit without a built IPA" },
        { status: 400 }
      );
    }

    if (!data.submitCreds) {
      return NextResponse.json(
        { error: "Submit credentials not found — please rebuild" },
        { status: 400 }
      );
    }

    // Xóa logs cũ
    const logsSnap = await ref.collection("logs").get();
    if (!logsSnap.empty) {
      const batch = db.batch();
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // Set status submit_pending — mac server sẽ pick up và chạy lại submit
    await ref.update({
      status:    "submit_pending",
      step:      FieldValue.delete(),
      error:     FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`[POST /api/builds/${id}/retry-submit]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
