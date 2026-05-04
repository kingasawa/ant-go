/**
 * POST /api/builds
 * Body: { projectId: string }
 *
 * 1. Validate x-api-key
 * 2. Check projectId tồn tại trong Firestore `projects`
 * 3. Tạo build job trong Firestore
 * 4. Generate signed URL → trả về cho CLI để upload trực tiếp
 */

import { NextRequest, NextResponse } from "next/server";
import { prepareBuild } from "@/lib/build.service";
import { validateCliToken } from "@/lib/cli-auth.service";

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
  const { projectId, platform, autoSubmit, buildNumber, teamId } = body;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId là bắt buộc" }, { status: 400 });
  }
  if (!platform || !["ios", "android"].includes(platform)) {
    return NextResponse.json({ error: 'platform phải là "ios" hoặc "android"' }, { status: 400 });
  }

  const parsedBuildNumber =
    typeof buildNumber === "number" && Number.isInteger(buildNumber) && buildNumber > 0
      ? buildNumber
      : undefined;

  try {
    const { jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName } = await prepareBuild(
      projectId.trim(),
      platform,
      { autoSubmit: autoSubmit === true, buildNumber: parsedBuildNumber, teamId: typeof teamId === "string" ? teamId : undefined }
    );
    return NextResponse.json({ jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
