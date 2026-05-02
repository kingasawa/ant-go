/**
 * AES-256-GCM encrypt/decrypt for App Store Connect private keys.
 * Key: ASC_ENCRYPTION_KEY env var — 64-char hex string (32 bytes).
 * Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer | null {
  const hex = process.env.ASC_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, "hex");
}

export function encryptAscKey(plain: string): string {
  const key = getKey();
  if (!key) {
    console.warn("[asc-crypto] ASC_ENCRYPTION_KEY not set — storing ASC key unencrypted");
    return `plain:${plain}`;
  }
  const iv     = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct     = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptAscKey(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice(6);
  const key = getKey();
  if (!key) throw new Error("ASC_ENCRYPTION_KEY not set — cannot decrypt ASC key");
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Invalid encrypted ASC key format");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(ctHex, "hex")).toString("utf8") + decipher.final("utf8");
}
