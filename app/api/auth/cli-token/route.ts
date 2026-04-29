/**
 * POST /api/auth/cli-token
 * Body: { idToken }
 * Dùng cho luồng --browser: đổi Firebase idToken (từ Google OAuth) lấy CLI token 24h.
 *
 * DELETE /api/auth/cli-token
 * Header: Authorization: Bearer <cliToken>
 * Revoke CLI token (logout).
 */

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { idToken } = body;

  if (!idToken) {
    return NextResponse.json({ error: "idToken là bắt buộc" }, { status: 400 });
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const profile = userDoc.data();

  const cliToken = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.collection("cli_tokens").doc(cliToken).set({
    uid: decoded.uid,
    email: decoded.email ?? "",
    displayName: profile?.displayName ?? decoded.name ?? null,
    photoURL: profile?.photoURL ?? decoded.picture ?? null,
    plan: profile?.plan ?? "free",
    builds: profile?.builds ?? 0,
    freeBuildsRemaining: profile?.freeBuildsRemaining ?? 10,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    revoked: false,
  });

  return NextResponse.json({
    cliToken,
    expiresAt: expiresAt.toISOString(),
    uid: decoded.uid,
    email: decoded.email ?? "",
    displayName: profile?.displayName ?? decoded.name ?? null,
    photoURL: profile?.photoURL ?? decoded.picture ?? null,
    plan: profile?.plan ?? "free",
    builds: profile?.builds ?? 0,
    freeBuildsRemaining: profile?.freeBuildsRemaining ?? 10,
  });
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const db = getAdminDb();
  const docRef = db.collection("cli_tokens").doc(token);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Token không tồn tại" }, { status: 404 });
  }

  await docRef.update({ revoked: true });
  return NextResponse.json({ ok: true });
}
