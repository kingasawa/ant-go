/**
 * Utilities for calling the App Store Connect API.
 * Uses jose to sign ES256 JWTs (no external ASC SDK needed).
 */
import { SignJWT, importPKCS8 } from "jose";

async function generateJwt(keyId: string, issuerId: string, privateKeyP8: string): Promise<string> {
  const key = await importPKCS8(privateKeyP8, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuedAt()
    .setIssuer(issuerId)
    .setAudience("appstoreconnect-v1")
    .setExpirationTime("20m")
    .sign(key);
}

/**
 * Fetches the team/org name from App Store Connect API.
 * Calls GET /v1/users?limit=1&filter[roles]=ACCOUNT_HOLDER to get the account holder's name.
 * Returns null if the call fails or the key has insufficient permissions.
 */
export async function fetchAscTeamName(
  keyId: string,
  issuerId: string,
  privateKeyP8: string
): Promise<string | null> {
  try {
    const jwt = await generateJwt(keyId, issuerId, privateKeyP8);

    const res = await fetch(
      "https://api.appstoreconnect.apple.com/v1/users?limit=1&filter[roles]=ACCOUNT_HOLDER",
      {
        headers: { Authorization: `Bearer ${jwt}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.data?.[0]?.attributes;
    if (!user) return null;

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || null;
  } catch {
    return null;
  }
}
