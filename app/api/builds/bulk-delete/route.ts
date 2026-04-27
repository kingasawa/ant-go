/**
 * POST /api/builds/bulk-delete
 * Xoá nhiều builds + logs subcollection cùng lúc
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json() as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const db = getAdminDb();

    await Promise.all(ids.map(async (id) => {
      const ref = db.collection(BUILDS_COLLECTION).doc(id);

      // Xoá logs subcollection
      let logsSnap = await ref.collection("logs").limit(500).get();
      while (!logsSnap.empty) {
        const batch = db.batch();
        logsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        logsSnap = await ref.collection("logs").limit(500).get();
      }

      await ref.delete();
    }));

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (err: any) {
    console.error("[POST /api/builds/bulk-delete]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

