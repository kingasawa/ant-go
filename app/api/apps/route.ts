/**
 * POST /api/apps
 * Auth: Firebase ID token (Bearer)
 *
 * Tạo app mới với server-side giới hạn 3 app cho FREE plan.
 * Body: { name: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PLAN_APP_LIMIT } from "@/lib/createUserProfile";

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

export async function POST(request: NextRequest) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name là bắt buộc" }, { status: 400 });
  }

  const db = getAdminDb();

  // Đọc plan của user
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data() ?? {};
  const plan: string = userData.plan ?? "free";
  const appLimit = PLAN_APP_LIMIT[plan] ?? 3;

  // Kiểm tra giới hạn app cho FREE plan
  if (appLimit !== -1) {
    const appsSnap = await db
      .collection("apps")
      .where("userId", "==", uid)
      .count()
      .get();

    const appCount = appsSnap.data().count;

    if (appCount >= appLimit) {
      return NextResponse.json(
        {
          error: `Plan ${plan.toUpperCase()} chỉ tạo được ${appLimit} app. Nâng cấp plan để tạo thêm tại antgo.work/account/billing`,
          code: "app_limit_reached",
          limit: appLimit,
          current: appCount,
        },
        { status: 403 }
      );
    }
  }

  // Tạo app document
  const appRef = await db.collection("apps").add({
    name,
    userId: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ appId: appRef.id, name }, { status: 201 });
}

