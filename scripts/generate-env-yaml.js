#!/usr/bin/env node
/**
 * Script tạo env.yaml cho App Engine từ:
 * - firebase-credentials.json (Admin SDK)
 * - .env.local (biến NEXT_PUBLIC_*)
 *
 * Dùng: node scripts/generate-env-yaml.js
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
const credFile = path.join(root, "firebase-credentials.json");
const envLocalFile = path.join(root, ".env.local");
const outputFile = path.join(root, "env.yaml");

// Đọc Firebase credentials
if (!fs.existsSync(credFile)) {
  console.error("❌  Không tìm thấy firebase-credentials.json");
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(credFile, "utf8"));
const credsJson = JSON.stringify(creds); // compact JSON, 1 dòng

// Đọc .env.local nếu có
let envVars = {};
if (fs.existsSync(envLocalFile)) {
  envVars = dotenv.parse(fs.readFileSync(envLocalFile));
  console.log("✅  Đọc biến từ .env.local");
} else {
  console.warn("⚠️   Không tìm thấy .env.local, dùng giá trị placeholder");
}

function getEnv(key, fallback = `REPLACE_${key}`) {
  return envVars[key] || fallback;
}

const yaml = `# Tự động tạo bởi scripts/generate-env-yaml.js
# KHÔNG commit file này lên git!
env_variables:
  FIREBASE_ADMIN_CREDENTIALS_JSON: '${credsJson.replace(/'/g, "''")}'
  NEXT_PUBLIC_FIREBASE_API_KEY: "${getEnv("NEXT_PUBLIC_FIREBASE_API_KEY")}"
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "${getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")}"
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "${getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")}"
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "${getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")}"
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "${getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")}"
  NEXT_PUBLIC_FIREBASE_APP_ID: "${getEnv("NEXT_PUBLIC_FIREBASE_APP_ID")}"
`;

fs.writeFileSync(outputFile, yaml, "utf8");
console.log("✅  Đã tạo env.yaml thành công!");
console.log(`📁  ${outputFile}`);

