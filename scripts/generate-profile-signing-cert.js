#!/usr/bin/env node
/**
 * Generates a self-signed certificate for signing .mobileconfig profiles.
 * Run once: node scripts/generate-profile-signing-cert.js
 * Then add PROFILE_SIGNING_CERT and PROFILE_SIGNING_KEY to Secret Manager.
 */

const forge = require("node-forge");

const pki  = forge.pki;
const keys = pki.rsa.generateKeyPair(2048);
const cert = pki.createCertificate();

cert.publicKey    = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter  = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
  { name: "commonName",       value: "Ant Go Profile Signing" },
  { name: "organizationName", value: "Ant Go" },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  { name: "basicConstraints", cA: true },
  { name: "keyUsage", keyCertSign: true, digitalSignature: true, nonRepudiation: true },
]);
cert.sign(keys.privateKey, forge.md.sha256.create());

const certPem = pki.certificateToPem(cert);
const keyPem  = pki.privateKeyToPem(keys.privateKey);

// Single-line versions for Secret Manager (newlines → \n)
const certOneLine = certPem.replace(/\n/g, "\\n");
const keyOneLine  = keyPem.replace(/\n/g, "\\n");

console.log("=== PROFILE_SIGNING_CERT ===");
console.log(certOneLine);
console.log();
console.log("=== PROFILE_SIGNING_KEY ===");
console.log(keyOneLine);
console.log();
console.log("Add these to Secret Manager:");
console.log("  gcloud secrets create PROFILE_SIGNING_CERT --data-file=- <<< '<paste cert>'");
console.log("  gcloud secrets create PROFILE_SIGNING_KEY  --data-file=- <<< '<paste key>'");
