/**
 * GET  /api/devices  — Lấy danh sách devices của user hiện tại
 * POST /api/devices  — Lưu device sau khi enrollment hoàn tất
 *
 * Auth: Firebase ID token trong header Authorization: Bearer <idToken>
 */

import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { validateCliToken } from "@/lib/cli-auth.service";

async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  // Firebase ID token (dashboard)
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {}
  // Fallback: CLI token
  const session = await validateCliToken(token);
  return session?.uid ?? null;
}

export async function GET(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("devices")
    .orderBy("addedAt", "desc")
    .get();

  const devices = snap.docs.map((d) => {
    const data = d.data();
    return {
      udid: d.id,
      name: data.name ?? null,
      deviceProduct: data.deviceProduct ?? null,
      deviceSerial: data.deviceSerial ?? null,
      source: data.source ?? "dashboard",
      addedAt: data.addedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { udid, name, deviceProduct, deviceSerial, source } = body;

  if (!udid || typeof udid !== "string") {
    return NextResponse.json({ error: "udid là bắt buộc" }, { status: 400 });
  }

  const db = getAdminDb();
  const docRef = db.collection("users").doc(uid).collection("devices").doc(udid.trim());

  await docRef.set({
    udid: udid.trim(),
    name: name?.trim() ?? null,
    deviceProduct: deviceProduct ?? null,
    deviceSerial: deviceSerial ?? null,
    source: source ?? "dashboard",
    addedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const udid = searchParams.get("udid");

  if (!udid) {
    return NextResponse.json({ error: "udid là bắt buộc" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("users").doc(uid).collection("devices").doc(udid).delete();

  return NextResponse.json({ ok: true });
}
