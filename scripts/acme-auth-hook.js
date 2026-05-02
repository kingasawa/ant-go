#!/usr/bin/env node
/**
 * certbot manual-auth-hook
 * Writes ACME challenge to Firestore so the Next.js route can serve it.
 * Usage (by certbot): CERTBOT_TOKEN=xxx CERTBOT_VALIDATION=yyy node scripts/acme-auth-hook.js
 */
const admin = require("firebase-admin");
const path  = require("path");
const fs    = require("fs");

const credPath = path.resolve(__dirname, "../env.local.json");
let cred;
if (fs.existsSync(credPath)) {
  cred = admin.credential.cert(JSON.parse(fs.readFileSync(credPath, "utf8")));
} else {
  // Fallback: use FIREBASE_ADMIN_CREDENTIALS_JSON env var
  const raw = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;
  if (!raw) { console.error("No Firebase credentials found"); process.exit(1); }
  cred = admin.credential.cert(JSON.parse(raw));
}

admin.initializeApp({ credential: cred });
const db = admin.firestore();

const token      = process.env.CERTBOT_TOKEN;
const validation = process.env.CERTBOT_VALIDATION;

if (!token || !validation) {
  console.error("CERTBOT_TOKEN and CERTBOT_VALIDATION must be set");
  process.exit(1);
}

(async () => {
  await db.collection("acme_challenges").doc(token).set({
    value:     `${token}.${validation}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✓ Challenge set: ${token}`);
  // Wait a moment to ensure Firestore propagates
  await new Promise(r => setTimeout(r, 3000));
  process.exit(0);
})();
