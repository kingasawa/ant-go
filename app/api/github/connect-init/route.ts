/**
 * POST /api/github/connect-init
 * Body: { antgoAppId: string, repoFullName: string, redirectAfter: string }
 * Auth: Firebase ID token
 *
 * Tạo state token lưu vào Firestore, trả về URL để redirect user sang GitHub
 * để cài GitHub App vào repo.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

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

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { antgoAppId, repoFullName, redirectAfter } = body as {
    antgoAppId?: string;
    repoFullName?: string;
    redirectAfter?: string;
  };

  if (!antgoAppId || !repoFullName) {
    return NextResponse.json({ error: "antgoAppId and repoFullName are required" }, { status: 400 });
  }

  const appSlug = process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return NextResponse.json({ error: "GITHUB_APP_SLUG chưa được cấu hình" }, { status: 500 });
  }

  const db = getAdminDb();

  const appDoc = await db.collection("apps").doc(antgoAppId).get();
  if (!appDoc.exists || appDoc.data()!.userId !== user.uid) {
    return NextResponse.json({ error: "App not found or forbidden" }, { status: 403 });
  }

  const stateToken = randomBytes(32).toString("hex");
  await db.collection("github_connect_states").doc(stateToken).set({
    antgoAppId,
    repoFullName,
    userId: user.uid,
    redirectAfter: redirectAfter ?? "/account",
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
  });

  const redirectUrl = `https://github.com/apps/${appSlug}/installations/new?state=${stateToken}`;
  return NextResponse.json({ redirectUrl });
}
