#!/usr/bin/env node
/**
 * fetch-asc-key.js — Cloud Build script
 * Đọc ASC credentials từ Firestore (per-user), decrypt và ghi JSON format Fastlane.
 *
 * Usage: node scripts/fetch-asc-key.js <userId> <outputPath>
 *
 * Output JSON format (Fastlane api_key_path):
 * { "key_id": "...", "issuer_id": "...", "key": "-----BEGIN PRIVATE KEY-----\n..." }
 */

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");
const { createDecipheriv } = require("crypto");

const [,, userId, outputPath] = process.argv;

if (!userId || !outputPath) {
  console.error("Usage: node fetch-asc-key.js <userId> <outputPath>");
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
  // Đọc từ users/{uid}/asc_credentials/default (per-user, không theo app)
  const snap = await db
    .collection("users").doc(userId)
    .collection("asc_credentials").doc("default")
    .get();

  if (!snap.exists) {
    console.error(`No ASC credentials found for user=${userId}`);
    process.exit(1);
  }

  const data = snap.data();
  if (!data.encryptedKey || !data.keyId || !data.issuerId) {
    console.error(`ASC credentials incomplete for user=${userId} — missing keyId or issuerId`);
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
  console.log(`✓ ASC key written to ${outputPath} (key_id=${data.keyId})`);
  process.exit(0);
})();
