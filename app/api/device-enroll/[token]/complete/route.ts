/**
 * POST /api/device-enroll/[token]/complete
 *
 * Receives CMS-signed plist from iPhone after profile installation.
 * Extracts UDID and stores it in Firestore.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

function extractUdidFromCmsBody(buf: Buffer): string | null {
  // CMS/PKCS7-signed body — find embedded plist XML
  const bufStr = buf.toString("binary");
  const xmlStart = bufStr.indexOf("<?xml");
  if (xmlStart === -1) return null;
  const plistEnd = bufStr.lastIndexOf("</plist>");
  if (plistEnd === -1) return null;
  const plistXml = bufStr.slice(xmlStart, plistEnd + "</plist>".length);
  const match = plistXml.match(/<key>UDID<\/key>\s*<string>([^<]+)<\/string>/);
  return match?.[1]?.trim() ?? null;
}

function extractField(buf: Buffer, key: string): string | null {
  const bufStr = buf.toString("binary");
  const xmlStart = bufStr.indexOf("<?xml");
  if (xmlStart === -1) return null;
  const plistEnd = bufStr.lastIndexOf("</plist>");
  if (plistEnd === -1) return null;
  const plistXml = bufStr.slice(xmlStart, plistEnd + "</plist>".length);
  const match = plistXml.match(new RegExp(`<key>${key}<\\/key>\\s*<string>([^<]+)<\\/string>`));
  return match?.[1]?.trim() ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const db = getAdminDb();
  const docRef = db.collection("device_enrollments").doc(token);
  const doc = await docRef.get();

  if (!doc.exists) {
    return new NextResponse("Token không hợp lệ", { status: 404 });
  }

  const data = doc.data()!;
  if (Date.now() > data.expiresAt) {
    return new NextResponse("Token đã hết hạn", { status: 410 });
  }

  const buf = Buffer.from(await request.arrayBuffer());
  const udid = extractUdidFromCmsBody(buf);

  if (!udid) {
    return new NextResponse("Không đọc được UDID", { status: 422 });
  }

  const deviceProduct = extractField(buf, "PRODUCT");
  const deviceSerial = extractField(buf, "SERIAL");

  await docRef.update({
    status: "registered",
    udid,
    deviceProduct: deviceProduct ?? null,
    deviceSerial: deviceSerial ?? null,
    registeredAt: Date.now(),
  });

  // Apple expects a signed profile response or a 200 empty body to confirm enrollment
  return new NextResponse(null, { status: 200 });
}
