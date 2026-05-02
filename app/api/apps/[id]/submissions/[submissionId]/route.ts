/**
 * GET /api/apps/[appName]/submissions/[submissionId]
 * Poll trạng thái của 1 submission.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { submissionId } = await params;
  const snap = await getAdminDb().collection("submissions").doc(submissionId).get();

  if (!snap.exists) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const data = snap.data()!;
  if (data.userId !== uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json({
    id:                submissionId,
    buildId:           data.buildId,
    buildNumber:       data.buildNumber ?? null,
    version:           data.version ?? null,
    status:            data.status,
    errorMessage:      data.errorMessage ?? null,
    testflightBuildId: data.testflightBuildId ?? null,
    createdAt:         data.createdAt?.toDate?.()?.toISOString() ?? null,
    completedAt:       data.completedAt?.toDate?.()?.toISOString() ?? null,
  });
}
