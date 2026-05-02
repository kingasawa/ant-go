/**
 * GET    /api/apps/[appName]/app-store-key  → { hasKey, keyId?, issuerId? }
 * POST   /api/apps/[appName]/app-store-key  body: { keyId, issuerId, privateKeyP8 }
 * DELETE /api/apps/[appName]/app-store-key
 *
 * privateKeyP8 is encrypted with AES-256-GCM before being stored in Firestore.
 * It is never returned via the API.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { encryptAscKey } from "@/lib/asc-crypto";

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

function keyDocRef(uid: string, appName: string) {
  return getAdminDb()
    .collection("users").doc(uid)
    .collection("app_store_keys").doc(appName);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: appName } = await params;
  const snap = await keyDocRef(uid, appName).get();

  if (!snap.exists) return NextResponse.json({ hasKey: false });

  const d = snap.data()!;
  return NextResponse.json({ hasKey: true, keyId: d.keyId, issuerId: d.issuerId });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: appName } = await params;
  const body = await request.json().catch(() => ({}));
  const { keyId, issuerId, privateKeyP8 } = body;

  if (!keyId?.trim() || !issuerId?.trim() || !privateKeyP8?.trim()) {
    return NextResponse.json({ error: "keyId, issuerId và privateKeyP8 là bắt buộc" }, { status: 400 });
  }

  // Validate that privateKeyP8 looks like a PEM key
  if (!privateKeyP8.includes("BEGIN") || !privateKeyP8.includes("KEY")) {
    return NextResponse.json({ error: "privateKeyP8 không hợp lệ — phải là nội dung file .p8" }, { status: 400 });
  }

  const encryptedKey = encryptAscKey(privateKeyP8.trim());

  await keyDocRef(uid, appName).set({
    keyId:        keyId.trim(),
    issuerId:     issuerId.trim(),
    encryptedKey,
    updatedAt:    FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: appName } = await params;
  await keyDocRef(uid, appName).delete();
  return NextResponse.json({ ok: true });
}

