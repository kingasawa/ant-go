/**
 * GET /api/builds/[id]/manifest
 * Proxies the manifest.plist from GCS so itms-services:// gets a clean HTTPS URL
 * instead of a double-encoded GCS signed URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const snap = await getAdminDb().collection(BUILDS_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return new NextResponse("Build not found", { status: 404 });
    }
    const d = snap.data()!;
    const manifestUrl: string | undefined = d.manifestUrl;
    if (!manifestUrl) {
      return new NextResponse("No manifest URL for this build", { status: 404 });
    }

    const gcsRes = await fetch(manifestUrl);
    if (!gcsRes.ok) {
      return new NextResponse(`Failed to fetch manifest: ${gcsRes.status}`, {
        status: 502,
      });
    }
    const body = await gcsRes.text();
    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.error(`[GET /api/builds/${id}/manifest]`, err.message);
    return new NextResponse(err.message, { status: 500 });
  }
}
