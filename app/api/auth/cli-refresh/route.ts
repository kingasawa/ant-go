/**
 * POST /api/auth/cli-refresh
 * Body: { refreshToken }
 * Dùng Firebase refreshToken để lấy idToken mới → tạo CLI token 24h mới.
 * Cho phép CLI tự gia hạn mà không cần user nhập lại mật khẩu.
 */

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { refreshToken } = body;

  if (!refreshToken) {
    return NextResponse.json({ error: "refreshToken là bắt buộc" }, { status: 400 });
  }

  // Đổi refreshToken lấy idToken mới qua Firebase REST API
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
      { status: 401 }
    );
  }

  const tokenData = await res.json();
  const idToken: string = tokenData.id_token;
  const newRefreshToken: string = tokenData.refresh_token;

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Không thể xác thực token mới" }, { status: 500 });
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
    refreshToken: newRefreshToken,
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
