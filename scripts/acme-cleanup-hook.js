#!/usr/bin/env node
/**
 * certbot manual-cleanup-hook — removes the ACME challenge from Firestore.
 */
const admin = require("firebase-admin");
const path  = require("path");
const fs    = require("fs");

const credPath = path.resolve(__dirname, "../env.local.json");
let cred;
if (fs.existsSync(credPath)) {
  cred = admin.credential.cert(JSON.parse(fs.readFileSync(credPath, "utf8")));
} else {
  const raw = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;
  if (!raw) process.exit(0);
  cred = admin.credential.cert(JSON.parse(raw));
}

admin.initializeApp({ credential: cred });
const db = admin.firestore();

(async () => {
  const token = process.env.CERTBOT_TOKEN;
  if (token) await db.collection("acme_challenges").doc(token).delete();
  console.log(`✓ Challenge cleaned up: ${token}`);
  process.exit(0);
})();
