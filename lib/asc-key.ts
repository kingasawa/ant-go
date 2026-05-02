import { getAdminDb } from "@/lib/firebase-admin";
import { decryptAscKey } from "@/lib/asc-crypto";

export async function getAscKeyForUser(uid: string, appName: string): Promise<{
  keyId: string;
  issuerId: string;
  privateKeyP8: string;
} | null> {
  const snap = await getAdminDb()
    .collection("users").doc(uid)
    .collection("app_store_keys").doc(appName)
    .get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  const privateKeyP8 = decryptAscKey(d.encryptedKey as string);
  return { keyId: d.keyId as string, issuerId: d.issuerId as string, privateKeyP8 };
}
