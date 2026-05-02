import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getAdminDb();
  const doc = await db.collection("acme_challenges").doc(token).get();
  if (!doc.exists) return new NextResponse("Not Found", { status: 404 });
  return new NextResponse(doc.data()!.value as string, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
