/**
 * GET /api/device-enroll/[token]/profile
 *
 * Returns an Apple Configuration Profile (.mobileconfig) with PayloadType "Profile Service".
 * iPhone installs this profile, then auto-POSTs device info (including UDID) to the complete endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const db = getAdminDb();
  const doc = await db.collection("device_enrollments").doc(token).get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Token không hợp lệ" }, { status: 404 });
  }

  const data = doc.data()!;
  if (Date.now() > data.expiresAt) {
    return NextResponse.json({ error: "Token đã hết hạn" }, { status: 410 });
  }

  const reqUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
  const completeUrl = `${baseUrl}/api/device-enroll/${token}/complete`;
  const payloadUUID = randomUUID().toUpperCase();

  const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${completeUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>SERIAL</string>
      <string>PRODUCT</string>
      <string>IMEI</string>
    </array>
  </dict>
  <key>PayloadDisplayName</key>
  <string>Ant Go Device Registration</string>
  <key>PayloadIdentifier</key>
  <string>com.ant-go.device-registration.${token}</string>
  <key>PayloadOrganization</key>
  <string>Ant Go</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
  <key>PayloadUUID</key>
  <string>${payloadUUID}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

  return new NextResponse(mobileconfig, {
    status: 200,
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": `attachment; filename="ant-go-enroll.mobileconfig"`,
    },
  });
}
