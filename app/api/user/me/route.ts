/**
 * GET /api/user/me
 * Authorization: Bearer <cliToken>
 *
 * Trả thông tin fresh từ Firestore: plan, quota, danh sách devices.
 * Dùng cho CLI trước khi build để kiểm tra quota và load devices.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCliToken } from "@/lib/cli-auth.service";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  const session = await validateCliToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập. Chạy: ant-go auth login" },
      { status: 401 }
    );
  }

  const db = getAdminDb();

  const [userSnap, devicesSnap] = await Promise.all([
    db.collection("users").doc(session.uid).get(),
    db.collection("users").doc(session.uid)
      .collection("devices")
      .orderBy("addedAt", "desc")
      .get(),
  ]);

  const userData = userSnap.data() ?? {};

  const devices = devicesSnap.docs.map((d) => {
    const data = d.data();
    return {
      udid:          d.id,
      name:          data.name          ?? null,
      deviceProduct: data.deviceProduct ?? null,
      deviceSerial:  data.deviceSerial  ?? null,
      addedAt:       data.addedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    uid:             session.uid,
    email:           session.email,
    plan:            userData.plan            ?? "free",
    planStatus:      userData.planStatus      ?? null,
    credits:         userData.credits         ?? 0,
    planCredits:     userData.planCredits     ?? 15,
    creditsResetAt:  userData.creditsResetAt?.toDate?.()?.toISOString() ?? null,
    devices,
  });
}
