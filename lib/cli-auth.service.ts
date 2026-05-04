import { getAdminDb } from "./firebase-admin";

export interface CliSession {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  plan: string;
  builds: number;
  credits: number;
  planCredits: number;
}

export async function validateCliToken(token: string | null | undefined): Promise<CliSession | null> {
  if (!token) return null;

  const db = getAdminDb();
  const doc = await db.collection("cli_tokens").doc(token).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.revoked) return null;

  const expiresAt: Date = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
  if (expiresAt < new Date()) return null;

  return {
    uid: data.uid,
    email: data.email,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    plan: data.plan ?? "free",
    builds: data.builds ?? 0,
    credits: data.credits ?? 0,
    planCredits: data.planCredits ?? 15,
  };
}
