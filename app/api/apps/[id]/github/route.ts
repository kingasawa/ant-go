/**
 * PATCH /api/apps/[id]/github
 * Body: { repoFullName: string | null }
 * Auth: Firebase ID token in Authorization: Bearer <token>
 *
 * Connect hoặc disconnect GitHub repo với app.
 * Mỗi app chỉ được connect với 1 repo (1-to-1).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function resolveUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { repoFullName } = body as { repoFullName?: string | null };

  if (repoFullName !== null && repoFullName !== undefined && repoFullName !== "") {
    if (typeof repoFullName !== "string" || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repoFullName)) {
      return NextResponse.json(
        { error: "repoFullName phải có định dạng owner/repo" },
        { status: 400 }
      );
    }
  }

  const db = getAdminDb();

  const appDoc = await db.collection("apps").doc(id).get();
  if (!appDoc.exists) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  if (appDoc.data()!.userId !== user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newRepo = repoFullName?.trim() || null;

  if (newRepo) {
    const conflict = await db
      .collection("apps")
      .where("userId", "==", user.uid)
      .where("githubRepo", "==", newRepo)
      .get();

    const others = conflict.docs.filter((d) => d.id !== id);
    if (others.length > 0) {
      return NextResponse.json(
        { error: `Repo "${newRepo}" đã được connect với app "${others[0].data().name}"` },
        { status: 409 }
      );
    }
  }

  await db.collection("apps").doc(id).update({
    githubRepo: newRepo,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, githubRepo: newRepo });
}
