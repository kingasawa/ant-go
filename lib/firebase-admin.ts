/**
 * lib/firebase-admin.ts — Firebase Admin SDK singleton (server-side only)
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

function getCredential() {
  // Ưu tiên 1: JSON string trong env var (production / Vercel)
  const jsonStr = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      return admin.credential.cert(parsed);
    } catch {
      throw new Error("FIREBASE_ADMIN_CREDENTIALS_JSON không phải JSON hợp lệ");
    }
  }

  // Ưu tiên 2: file path
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH
    ? path.resolve(process.env.FIREBASE_ADMIN_CREDENTIALS_PATH)
    : path.resolve(process.cwd(), "firebase-credentials.json");

  if (fs.existsSync(filePath)) {
    return admin.credential.cert(JSON.parse(fs.readFileSync(filePath, "utf8")));
  }

  throw new Error(
    "Không tìm thấy Firebase Admin credentials.\n" +
    "  → Set FIREBASE_ADMIN_CREDENTIALS_JSON trong .env.local\n" +
    "  → Hoặc đặt firebase-credentials.json vào thư mục gốc project"
  );
}

function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;
  return admin.initializeApp({
    credential:    getCredential(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminDb() {
  return getAdminApp().firestore();
}

export function getAdminBucket() {
  return getAdminApp().storage().bucket();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}
