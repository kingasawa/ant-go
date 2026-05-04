/**
 * POST /api/user/asc-key
 * Auth: CLI token (Bearer)
 * Body: { teamId, keyId, issuerId, privateKeyP8 }
 *
 * Lưu ASC API Key vào users/{uid}/asc_keys/{teamId}
 * Key gắn với Apple Developer Team — dùng được cho tất cả app trong team đó.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth.service";
import { getAdminDb } from "@/lib/firebase-admin";
import { encryptAscKey } from "@/lib/asc-crypto";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  const session = await validateCliToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập. Chạy: ant-go auth login" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { teamId, keyId, issuerId, privateKeyP8 } = body;

  if (!teamId?.trim() || !keyId?.trim() || !issuerId?.trim() || !privateKeyP8?.trim()) {
    return NextResponse.json(
      { error: "teamId, keyId, issuerId và privateKeyP8 là bắt buộc" },
      { status: 400 }
    );
  }

  if (!privateKeyP8.includes("BEGIN") || !privateKeyP8.includes("KEY")) {
    return NextResponse.json(
      { error: "privateKeyP8 không hợp lệ — phải là nội dung file .p8" },
      { status: 400 }
    );
  }

  const encryptedKey = encryptAscKey(privateKeyP8.trim());

  await getAdminDb()
    .collection("users").doc(session.uid)
    .collection("asc_keys").doc(teamId.trim())
    .set({
      keyId:        keyId.trim(),
      issuerId:     issuerId.trim(),
      encryptedKey,
      updatedAt:    FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ ok: true });
}
