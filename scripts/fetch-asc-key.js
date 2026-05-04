#!/usr/bin/env node
/**
 * fetch-asc-key.js — Cloud Build script
 * Đọc ASC key từ Firestore, decrypt và ghi ra JSON file format của Fastlane.
 *
 * Usage: node scripts/fetch-asc-key.js <userId> <teamId> <appName> <outputPath>
 *
 * Tìm key theo thứ tự:
 *   1. users/{userId}/asc_keys/{teamId}       ← per-team (CLI tự động upload)
 *   2. users/{userId}/app_store_keys/{appName} ← per-app  (dashboard manual, backward compat)
 *
 * Output JSON format (Fastlane api_key_path):
 * { "key_id": "...", "issuer_id": "...", "key": "-----BEGIN PRIVATE KEY-----\n..." }
 */

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");
const { createDecipheriv } = require("crypto");

const [,, userId, teamId, appName, outputPath] = process.argv;

if (!userId || !outputPath) {
  console.error("Usage: node fetch-asc-key.js <userId> <teamId> <appName> <outputPath>");
  process.exit(1);
}

// Firebase init
const credPath = path.resolve(__dirname, "../env.local.json");
let cred;
if (fs.existsSync(credPath)) {
  cred = admin.credential.cert(JSON.parse(fs.readFileSync(credPath, "utf8")));
} else {
  const raw = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;
  if (!raw) { console.error("No Firebase credentials found"); process.exit(1); }
  cred = admin.credential.cert(JSON.parse(raw));
}
admin.initializeApp({ credential: cred });
const db = admin.firestore();

function decryptAscKey(stored) {
  if (stored.startsWith("plain:")) return stored.slice(6);
  const encKey = process.env.ASC_ENCRYPTION_KEY;
  if (!encKey || encKey.length !== 64) {
    throw new Error("ASC_ENCRYPTION_KEY not set or invalid — cannot decrypt ASC key");
  }
  const key = Buffer.from(encKey, "hex");
  const [ivHex, tagHex, ctHex] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(ctHex, "hex")).toString("utf8") + decipher.final("utf8");
}

(async () => {
  let data = null;
  let source = "";

  // 1. Thử path mới: per-team
  if (teamId && teamId !== "''") {
    const snap = await db
      .collection("users").doc(userId)
      .collection("asc_keys").doc(teamId)
      .get();
    if (snap.exists) {
      data   = snap.data();
      source = `asc_keys/${teamId}`;
    }
  }

  // 2. Fallback: path cũ per-app
  if (!data && appName && appName !== "''") {
    const snap = await db
      .collection("users").doc(userId)
      .collection("app_store_keys").doc(appName)
      .get();
    if (snap.exists) {
      data   = snap.data();
      source = `app_store_keys/${appName}`;
    }
  }

  if (!data) {
    console.error(`No ASC key found for user=${userId} (tried teamId=${teamId}, appName=${appName})`);
    process.exit(1);
  }

  const privateKeyP8 = decryptAscKey(data.encryptedKey);

  // Fastlane expects key with literal \n (not real newlines) in JSON
  const fastlaneKey = {
    key_id:    data.keyId,
    issuer_id: data.issuerId,
    key:       privateKeyP8.replace(/\n/g, "\\n"),
  };

  fs.writeFileSync(outputPath, JSON.stringify(fastlaneKey, null, 2));
  console.log(`✓ ASC key written to ${outputPath} (key_id=${data.keyId}, source=${source})`);
  process.exit(0);
})();
