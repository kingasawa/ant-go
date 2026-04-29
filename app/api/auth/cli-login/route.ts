/**
 * POST /api/auth/cli-login
 * Body: { email, password }
 *
 * Xác thực email/password qua Firebase REST API, tạo CLI token 24h,
 * trả về thông tin user lấy từ Firestore.
 */

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email và password là bắt buộc" },
      { status: 400 }
    );
  }

  // Xác thực với Firebase REST API
  const firebaseRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const firebaseData = await firebaseRes.json();

  if (!firebaseRes.ok) {
    const code = firebaseData.error?.message ?? "INVALID_LOGIN_CREDENTIALS";
    return NextResponse.json({ error: mapFirebaseError(code) }, { status: 401 });
  }

  const { idToken, refreshToken } = firebaseData;

  // Verify token để lấy uid
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Không thể xác thực token" }, { status: 500 });
  }

  // Lấy thông tin user từ Firestore
  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const profile = userDoc.data();

  // Tạo CLI token có hiệu lực 24h
  const cliToken = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.collection("cli_tokens").doc(cliToken).set({
    uid: decoded.uid,
    email: decoded.email ?? email,
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
    refreshToken,
    expiresAt: expiresAt.toISOString(),
    uid: decoded.uid,
    email: decoded.email ?? email,
    displayName: profile?.displayName ?? decoded.name ?? null,
    photoURL: profile?.photoURL ?? decoded.picture ?? null,
    plan: profile?.plan ?? "free",
    builds: profile?.builds ?? 0,
    freeBuildsRemaining: profile?.freeBuildsRemaining ?? 10,
  });
}

function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    EMAIL_NOT_FOUND: "Không tìm thấy tài khoản với email này.",
    INVALID_PASSWORD: "Mật khẩu không đúng.",
    INVALID_EMAIL: "Email không hợp lệ.",
    USER_DISABLED: "Tài khoản đã bị vô hiệu hóa.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Quá nhiều lần thử. Vui lòng thử lại sau.",
    INVALID_LOGIN_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  };
  return map[code] ?? "Đăng nhập thất bại. Kiểm tra lại email và mật khẩu.";
}
