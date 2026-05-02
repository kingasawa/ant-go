#!/usr/bin/env node
/**
 * update-submission-status.js — Cloud Build script
 * Cập nhật trạng thái submission trong Firestore.
 *
 * Usage: node scripts/update-submission-status.js <submissionId> <status> [errorMessage]
 * Status: pending | uploading | processing | done | failed
 */

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");

const [,, submissionId, status, errorMessage] = process.argv;

if (!submissionId || !status) {
  console.error("Usage: node update-submission-status.js <submissionId> <status> [errorMessage]");
  process.exit(1);
}

const VALID = ["pending", "uploading", "processing", "done", "failed"];
if (!VALID.includes(status)) {
  console.error(`Invalid status: ${status}. Must be one of: ${VALID.join(", ")}`);
  process.exit(1);
}

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

(async () => {
  const update = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === "done" || status === "failed") {
    update.completedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (errorMessage) {
    update.errorMessage = errorMessage;
  }

  await db.collection("submissions").doc(submissionId).update(update);
  console.log(`✓ Submission ${submissionId} → ${status}`);
  process.exit(0);
})();
