import { getAdminDb } from "@/lib/firebase-admin";
import { decryptAscKey } from "@/lib/asc-crypto";

export interface AscCredentials {
  keyId: string | null;
  issuerId: string | null;
  privateKeyP8: string | null;
  hasKey: boolean;
}

/** Đọc ASC credentials từ users/{uid}/asc_credentials (per-user, không theo app) */
export async function getAscKeyForUser(uid: string): Promise<AscCredentials | null> {
  const snap = await getAdminDb()
    .collection("users").doc(uid)
    .collection("asc_credentials").doc("default")
    .get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const privateKeyP8 = d.encryptedKey ? decryptAscKey(d.encryptedKey as string) : null;
  return {
    keyId:        (d.keyId as string) ?? null,
    issuerId:     (d.issuerId as string) ?? null,
    privateKeyP8,
    hasKey:       !!d.encryptedKey,
  };
}

/** Kiểm tra credentials đủ để submit TestFlight chưa */
export function isAscReady(creds: AscCredentials | null): boolean {
  return !!(creds?.hasKey && creds.keyId && creds.issuerId);
}
