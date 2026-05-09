import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

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

export async function GET(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();

  // App Store Connect API Keys — users/{uid}/asc_keys/{teamId}
  const ascSnap = await db
    .collection("users").doc(uid)
    .collection("asc_keys")
    .get();

  const ascKeys = ascSnap.docs.map((d) => ({
    teamId:    d.id,
    keyId:     d.data().keyId     ?? null,
    issuerId:  d.data().issuerId  ?? null,
    teamName:  d.data().teamName  ?? null,
    updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json({ ascKeys });
}

export async function DELETE(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");
  const type   = searchParams.get("type");

  if (!teamId || !type) {
    return NextResponse.json({ error: "teamId và type là bắt buộc" }, { status: 400 });
  }

  const db = getAdminDb();

  if (type === "ascKey") {
    await db.collection("users").doc(uid).collection("asc_keys").doc(teamId).delete();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "type không hợp lệ" }, { status: 400 });
}
