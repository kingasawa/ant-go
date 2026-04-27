/**
 * GET /api/builds/[id]/log
 * Proxy build.log từ Firebase Storage về browser — tránh CORS.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const snap = await getAdminDb().collection(BUILDS_COLLECTION).doc(params.id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    const buildLogUrl: string | undefined = snap.data()!.buildLogUrl;
    if (!buildLogUrl) {
      return NextResponse.json({ error: "Log file not available for this build" }, { status: 404 });
    }

    const storageRes = await fetch(buildLogUrl);
    if (!storageRes.ok) {
      return NextResponse.json(
        { error: `Storage returned ${storageRes.status}` },
        { status: 502 }
      );
    }

    const text = await storageRes.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
