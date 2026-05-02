/**
 * GET  /api/apps/[appName]/submissions   → danh sách, limit 20, desc
 * POST /api/apps/[appName]/submissions   body: { buildId }
 *   → tạo submission doc + trigger Cloud Build upload job
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { CloudBuildClient } from "@google-cloud/cloudbuild";
import { getAscKeyForUser } from "../app-store-key/route";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appName: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appName } = await params;
  const db = getAdminDb();

  const snap = await db.collection("submissions")
    .where("appName", "==", appName)
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const submissions = snap.docs.map((d) => {
    const data = d.data();
    return {
      id:                 d.id,
      buildId:            data.buildId,
      buildNumber:        data.buildNumber ?? null,
      version:            data.version ?? null,
      status:             data.status,
      errorMessage:       data.errorMessage ?? null,
      testflightBuildId:  data.testflightBuildId ?? null,
      createdAt:          data.createdAt?.toDate?.()?.toISOString() ?? null,
      completedAt:        data.completedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ submissions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appName: string }> }
) {
  const uid = await resolveUid(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appName } = await params;
  const body = await request.json().catch(() => ({}));
  const { buildId } = body;

  if (!buildId || typeof buildId !== "string") {
    return NextResponse.json({ error: "buildId là bắt buộc" }, { status: 400 });
  }

  const db = getAdminDb();

  // Đọc build doc
  const buildSnap = await db.collection("builds").doc(buildId).get();
  if (!buildSnap.exists) {
    return NextResponse.json({ error: "Build không tồn tại" }, { status: 404 });
  }
  const buildData = buildSnap.data()!;

  if (buildData.status !== "success") {
    return NextResponse.json({ error: "Chỉ có thể submit build đã thành công" }, { status: 422 });
  }
  if (!buildData.ipaUrl) {
    return NextResponse.json({ error: "Build chưa có IPA" }, { status: 422 });
  }

  // Đọc app info để lấy bundleId và version
  const appsSnap = await db.collection("apps")
    .where("name", "==", appName)
    .where("userId", "==", uid)
    .limit(1)
    .get();
  const appData = appsSnap.empty ? null : appsSnap.docs[0].data();
  const bundleId = appData?.bundleId ?? buildData.bundleId ?? null;
  const version  = appData?.version  ?? null;

  // Kiểm tra ASC key
  const ascKey = await getAscKeyForUser(uid, appName);
  if (!ascKey) {
    return NextResponse.json({ error: "missing_asc_key" }, { status: 422 });
  }

  const submissionId = randomUUID();

  // Tạo submission doc
  await db.collection("submissions").doc(submissionId).set({
    appName,
    buildId,
    ipaUrl:            buildData.ipaUrl,
    userId:            uid,
    bundleId:          bundleId ?? null,
    version:           version ?? null,
    buildNumber:       buildData.buildNumber ?? null,
    status:            "pending",
    errorMessage:      null,
    testflightBuildId: null,
    createdAt:         FieldValue.serverTimestamp(),
    completedAt:       null,
  });

  // Trigger Cloud Build job
  try {
    await triggerSubmitJob({ submissionId, ipaUrl: buildData.ipaUrl as string, appName, userId: uid });
  } catch (err: any) {
    // Nếu Cloud Build lỗi, cập nhật submission về failed
    await db.collection("submissions").doc(submissionId).update({
      status:       "failed",
      errorMessage: `Không thể khởi động upload job: ${err.message}`,
      completedAt:  FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ error: "Không thể khởi động upload job" }, { status: 500 });
  }

  return NextResponse.json({ submissionId }, { status: 201 });
}

async function triggerSubmitJob({
  submissionId,
  ipaUrl,
  appName,
  userId,
}: {
  submissionId: string;
  ipaUrl: string;
  appName: string;
  userId: string;
}) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || "ant-go";
  const client = new CloudBuildClient();

  await client.createBuild({
    projectId,
    build: {
      timeout: { seconds: 1800 }, // 30 phút
      steps: [
        // 1. Download IPA
        {
          name: "gcr.io/cloud-builders/curl",
          args: ["-L", ipaUrl, "-o", "/workspace/app.ipa"],
        },
        // 2. Fetch ASC key + cập nhật status uploading
        {
          name: "node:20-slim",
          entrypoint: "bash",
          secretEnv: ["FIREBASE_ADMIN_CREDENTIALS_JSON"],
          args: [
            "-c",
            [
              "cd /workspace",
              "npm install firebase-admin --quiet --no-audit --no-fund --prefix /tmp/deps",
              `NODE_PATH=/tmp/deps/node_modules node scripts/fetch-asc-key.js '${userId}' '${appName}' /workspace/asc_key.json`,
              `NODE_PATH=/tmp/deps/node_modules node scripts/update-submission-status.js '${submissionId}' uploading`,
            ].join(" && "),
          ],
        },
        // 3. Upload lên TestFlight bằng Fastlane
        {
          name: "ruby:3.2-slim",
          entrypoint: "bash",
          args: [
            "-c",
            [
              "gem install fastlane --no-document -q",
              "fastlane run upload_to_testflight ipa:/workspace/app.ipa api_key_path:/workspace/asc_key.json skip_waiting_for_build_processing:true",
            ].join(" && "),
          ],
        },
        // 4. Cập nhật status done
        {
          name: "node:20-slim",
          entrypoint: "bash",
          secretEnv: ["FIREBASE_ADMIN_CREDENTIALS_JSON"],
          args: [
            "-c",
            `NODE_PATH=/tmp/deps/node_modules node scripts/update-submission-status.js '${submissionId}' done`,
          ],
        },
      ],
      availableSecrets: {
        secretManager: [
          {
            versionName: `projects/${projectId}/secrets/FIREBASE_ADMIN_CREDENTIALS_JSON/versions/latest`,
            env: "FIREBASE_ADMIN_CREDENTIALS_JSON",
          },
        ],
      },
      serviceAccount: `ant-go@appspot.gserviceaccount.com`,
    },
  });
}
