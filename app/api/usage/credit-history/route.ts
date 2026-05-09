import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("creditHistory")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const history = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      reason:       data.reason       ?? null,
      amount:       data.amount       ?? 0,
      balanceAfter: data.balanceAfter ?? 0,
      buildId:      data.buildId      ?? null,
      createdAt:    data.createdAt?.seconds ? { seconds: data.createdAt.seconds } : null,
    };
  });

  return NextResponse.json({ history });
}
