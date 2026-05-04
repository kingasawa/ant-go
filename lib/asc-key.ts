import { getAdminDb } from "@/lib/firebase-admin";
import { decryptAscKey } from "@/lib/asc-crypto";

interface AscKeyResult {
  keyId: string;
  issuerId: string;
  privateKeyP8: string;
}

/**
 * Lấy ASC key cho user.
 * Thử theo thứ tự:
 *   1. users/{uid}/asc_keys/{teamId}       ← per-team (CLI tự động upload)
 *   2. users/{uid}/app_store_keys/{appName} ← per-app  (dashboard manual, backward compat)
 */
export async function getAscKeyForUser(
  uid: string,
  opts: { teamId?: string | null; appName?: string | null }
): Promise<AscKeyResult | null> {
  const db = getAdminDb();

  // 1. Thử path mới: per-team
  if (opts.teamId) {
    const snap = await db
      .collection("users").doc(uid)
      .collection("asc_keys").doc(opts.teamId)
      .get();
    if (snap.exists) {
      const d = snap.data()!;
      return {
        keyId:        d.keyId as string,
        issuerId:     d.issuerId as string,
        privateKeyP8: decryptAscKey(d.encryptedKey as string),
      };
    }
  }

  // 2. Fallback: path cũ per-app (dashboard setup thủ công)
  if (opts.appName) {
    const snap = await db
      .collection("users").doc(uid)
      .collection("app_store_keys").doc(opts.appName)
      .get();
    if (snap.exists) {
      const d = snap.data()!;
      return {
        keyId:        d.keyId as string,
        issuerId:     d.issuerId as string,
        privateKeyP8: decryptAscKey(d.encryptedKey as string),
      };
    }
  }

  return null;
}
