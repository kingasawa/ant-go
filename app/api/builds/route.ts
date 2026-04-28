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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { projectId, platform, autoSubmit } = body;

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId là bắt buộc" }, { status: 400 });
  }
  if (!platform || !["ios", "android"].includes(platform)) {
    return NextResponse.json({ error: 'platform phải là "ios" hoặc "android"' }, { status: 400 });
  }

  try {
    const { jobId, tarUrl, credsUrl } = await prepareBuild(projectId.trim(), platform, {
      autoSubmit: autoSubmit === true,
    });
    return NextResponse.json({ jobId, tarUrl, credsUrl }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
