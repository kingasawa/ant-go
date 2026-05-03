/**
 * GET    /api/apps/[appName]/app-store-key  → proxy sang /api/user/asc-credentials
 * POST   /api/apps/[appName]/app-store-key  → proxy sang /api/user/asc-credentials
 * DELETE /api/apps/[appName]/app-store-key  → proxy sang /api/user/asc-credentials
 *
 * Giữ lại route này để backward-compat với AppStoreKeyModal và submissions.
 * Thực tế lưu vào users/{uid}/asc_credentials (per-user).
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void params; // appName unused — per-user now
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await credDocRef(uid).get();
  if (!snap.exists) return NextResponse.json({ hasKey: false });

  const d = snap.data()!;
  return NextResponse.json({ hasKey: !!d.encryptedKey, keyId: d.keyId ?? null, issuerId: d.issuerId ?? null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void params;
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { keyId, issuerId, privateKeyP8 } = body;

  if (!keyId?.trim() || !issuerId?.trim() || !privateKeyP8?.trim()) {
    return NextResponse.json({ error: "keyId, issuerId và privateKeyP8 là bắt buộc" }, { status: 400 });
  }
  if (!privateKeyP8.includes("BEGIN") || !privateKeyP8.includes("KEY")) {
    return NextResponse.json({ error: "privateKeyP8 không hợp lệ — phải là nội dung file .p8" }, { status: 400 });
  }

  await credDocRef(uid).set({
    encryptedKey: encryptAscKey(privateKeyP8.trim()),
    keyId:        keyId.trim(),
    issuerId:     issuerId.trim(),
    updatedAt:    FieldValue.serverTimestamp(),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void params;
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await credDocRef(uid).delete();
  return NextResponse.json({ ok: true });
}
