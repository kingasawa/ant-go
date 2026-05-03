/**
 * GET    /api/user/asc-credentials  → { hasKey, keyId?, issuerId? }
 * POST   /api/user/asc-credentials  body: { privateKeyP8?, keyId?, issuerId? }
 * DELETE /api/user/asc-credentials
 *
 * Per-user ASC credentials — không phân theo app.
 * p8 được mã hoá AES-256-GCM, không bao giờ trả về client.
 * Hỗ trợ cả Firebase ID Token (dashboard) và CLI token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { encryptAscKey } from "@/lib/asc-crypto";
import { validateCliToken } from "@/lib/cli-auth.service";

async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch { /* not a Firebase ID token */ }
  const session = await validateCliToken(token);
  return session?.uid ?? null;
}

function credDocRef(uid: string) {
  return getAdminDb()
    .collection("users").doc(uid)
    .collection("asc_credentials").doc("default");
}

export async function GET(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await credDocRef(uid).get();
  if (!snap.exists) return NextResponse.json({ hasKey: false });

  const d = snap.data()!;
  return NextResponse.json({
    hasKey:   !!d.encryptedKey,
    keyId:    d.keyId ?? null,
    issuerId: d.issuerId ?? null,
  });
}

export async function POST(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { privateKeyP8, keyId, issuerId } = body;

  // Phải có ít nhất 1 field để update
  if (!privateKeyP8 && !keyId && !issuerId) {
    return NextResponse.json(
      { error: "Cần ít nhất một trong: privateKeyP8, keyId, issuerId" },
      { status: 400 }
    );
  }

  if (privateKeyP8 && (!privateKeyP8.includes("BEGIN") || !privateKeyP8.includes("KEY"))) {
    return NextResponse.json(
      { error: "privateKeyP8 không hợp lệ — phải là nội dung file .p8" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (privateKeyP8) updates.encryptedKey = encryptAscKey(privateKeyP8.trim());
  if (keyId !== undefined) updates.keyId = keyId?.trim() ?? null;
  if (issuerId !== undefined) updates.issuerId = issuerId?.trim() ?? null;

  await credDocRef(uid).set(updates, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await credDocRef(uid).delete();
  return NextResponse.json({ ok: true });
}

