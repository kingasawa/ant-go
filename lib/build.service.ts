/**
 * lib/build.service.ts — Logic build: validate projectId, signed URL, Apple cert/profile
 * Chạy server-side trong Next.js API routes
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getAdminDb, getAdminBucket } from "./firebase-admin";
import {
  Auth,
  Certificate,
  CertificateType,
  createCertificateAndP12Async,
  BundleId,
  Profile,
  ProfileType,
} from "@expo/apple-utils";

const CERT_CACHE = path.join(os.homedir(), ".ant-go", ".cert-cache.json");
const BUILDS_COLLECTION = process.env.BUILDS_COLLECTION || "builds";

interface AppleCreds {
  p12Base64: string;
  p12Password: string;
  mobileprovisionBase64: string;
  teamId: string;
  apiKeyId?: string;
  apiIssuerId?: string;
  privateKey?: string;
}


// ── Cert cache ────────────────────────────────────────────────────────────────
interface CertCache {
  certId: string;
  p12Base64: string;
  p12Password: string;
  expiresAt: string;
}

function loadCachedP12(): CertCache | null {
  if (!fs.existsSync(CERT_CACHE)) return null;
  try {
    const d: CertCache = JSON.parse(fs.readFileSync(CERT_CACHE, "utf8"));
    if (new Date(d.expiresAt) <= new Date()) { fs.unlinkSync(CERT_CACHE); return null; }
    return d;
  } catch { return null; }
}

function saveCachedP12(data: CertCache) {
  fs.mkdirSync(path.dirname(CERT_CACHE), { recursive: true });
  fs.writeFileSync(CERT_CACHE, JSON.stringify(data, null, 2));
}

// ── Apple helpers ─────────────────────────────────────────────────────────────
async function loginApple(creds: AppleCreds) {
  const ctx = await Auth.loginAsync({
    teamId:      creds.teamId,
    apiKeyId:    creds.apiKeyId,
    apiIssuerID: creds.apiIssuerId,
    privateKey:  creds.privateKey,
  } as any);
  if (!ctx) throw new Error("Apple API Key login failed");
  return ctx.context ?? ctx;
}

async function ensureDistributionCert(ctx: any): Promise<CertCache> {
  const existing    = await Certificate.getAsync(ctx, { query: { filter: { certificateType: [CertificateType.DISTRIBUTION] } } });
  const existingIds = new Set(existing.map((c: any) => c.id));
  const cached = loadCachedP12();
  if (cached && existingIds.has(cached.certId)) return cached;

  let result: any;
  try {
    result = await createCertificateAndP12Async(ctx, { certificateType: CertificateType.DISTRIBUTION });
  } catch (err: any) {
    if (/already have a current.*certificate|pending certificate/i.test(err.message))
      throw new Error("Certificate limit reached. Delete one at https://developer.apple.com/account/resources/certificates/list");
    throw err;
  }
  const certsAfter = await Certificate.getAsync(ctx, { query: { filter: { certificateType: [CertificateType.DISTRIBUTION] } } });
  const newCert    = certsAfter.find((c: any) => !existingIds.has(c.id));
  const certId     = newCert?.id ?? result.certificate?.id;
  const expiresAt  = newCert?.attributes?.expirationDate ?? new Date(Date.now() + 365 * 86400000).toISOString();
  const entry: CertCache = { certId, p12Base64: result.certificateP12, p12Password: result.password || "", expiresAt };
  saveCachedP12(entry);
  return entry;
}

async function ensureProvisioningProfile(ctx: any, certId: string, bundleId: string): Promise<string> {
  const allBundleIds = await BundleId.getAsync(ctx, {});
  const bundleIdObj  = allBundleIds.find((b: any) => b.attributes?.identifier === bundleId);
  if (!bundleIdObj) throw new Error(`App ID "${bundleId}" not found on Apple Developer`);

  const allProfiles = await Profile.getAsync(ctx, {
    query: { filter: { profileType: [ProfileType.IOS_APP_STORE] }, includes: (Profile as any).DEFAULT_INCLUDES },
  });
  const existing = allProfiles.find((p: any) => p.attributes?.bundleId?.attributes?.identifier === bundleId);

  let profile: any = null;
  if (existing) {
    if (existing.attributes?.profileState === "ACTIVE") profile = existing;
    else await Profile.deleteAsync(ctx, { id: existing.id });
  }
  if (!profile) {
    profile = await Profile.createAsync(ctx, {
      bundleId: bundleIdObj.id, certificates: [certId], devices: [],
      name: `AppStore ${new Date().toISOString().slice(0, 10)}`, profileType: ProfileType.IOS_APP_STORE,
    });
  }
  const fresh = await Profile.infoAsync(ctx, { id: profile.id });
  const data  = fresh.attributes?.profileContent ?? profile.attributes?.profileContent;
  if (!data) throw new Error("Profile has no content (profileContent missing)");
  return typeof data === "string" ? data : Buffer.from(data).toString("base64");
}

// ── prepareBuild ──────────────────────────────────────────────────────────────
export async function prepareBuild(
  projectId: string,
  platform: "ios" | "android",
  options: { autoSubmit?: boolean; buildNumber?: number; teamId?: string } = {}
) {
  const db     = getAdminDb();
  const bucket = getAdminBucket();

  const projectRef  = db.collection("apps").doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    const err: any = new Error(`Project ID "${projectId}" không tồn tại`);
    err.status = 404;
    throw err;
  }

  // Resolve buildNumber: dùng từ ant.json nếu có, không thì auto-increment
  let resolvedBuildNumber: number;
  if (options.buildNumber != null && Number.isInteger(options.buildNumber) && options.buildNumber > 0) {
    resolvedBuildNumber = options.buildNumber;
    // Đồng bộ lastBuildNumber lên Firestore nếu số mới lớn hơn
    const last = projectSnap.data()?.lastBuildNumber ?? 0;
    if (resolvedBuildNumber > last) {
      await projectRef.set({ lastBuildNumber: resolvedBuildNumber }, { merge: true });
    }
  } else {
    // Auto-increment atomic
    resolvedBuildNumber = await db.runTransaction(async (tx) => {
      const snap = await tx.get(projectRef);
      const last = snap.data()?.lastBuildNumber ?? 0;
      const next = last + 1;
      tx.update(projectRef, { lastBuildNumber: next });
      return next;
    });
  }

  const jobId    = Date.now().toString();
  const basePath = `builds/${jobId}`;
  const tarName  = platform === "android" ? "android.tar.gz" : "ios.tar.gz";

  await db.collection(BUILDS_COLLECTION).doc(jobId).set({
    projectId,
    platform,
    userId:      projectSnap.data()?.userId ?? null,
    appName:     projectSnap.data()?.name   ?? null,
    status:      "uploading",
    step:        "uploading",
    autoSubmit:  options.autoSubmit ?? false,
    teamId:      options.teamId ?? null,
    buildNumber: resolvedBuildNumber,
    basePath,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const getUrl = (file: string, contentType: string) =>
    bucket.file(`${basePath}/${file}`).getSignedUrl({
      action:      "write",
      expires:     Date.now() + 30 * 60 * 1000,
      contentType,
    }).then(([url]) => url);

  const [tarUrl, credsUrl] = await Promise.all([
    getUrl(tarName,            "application/gzip"),
    getUrl("credentials.json", "application/json"),
  ]);

  return { jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName: projectSnap.data()?.name ?? null };
}

// ── withTimeout ───────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout sau ${ms / 1000}s tại bước: ${label}`)), ms)
    ),
  ]);
}

// ── startBuild ────────────────────────────────────────────────────────────────
export async function startBuild(jobId: string) {
  const db     = getAdminDb();
  const bucket = getAdminBucket();

  const update = (fields: object) =>
    db.collection(BUILDS_COLLECTION).doc(jobId).set(
      { ...fields, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

  try {
    const jobSnap = await db.collection(BUILDS_COLLECTION).doc(jobId).get();
    if (!jobSnap.exists) throw new Error(`Build job ${jobId} không tồn tại`);

    const { basePath, platform } = jobSnap.data()!;
    const tarName = platform === "android" ? "android.tar.gz" : "ios.tar.gz";

    const [[tarExists], [credsExists]] = await Promise.all([
      bucket.file(`${basePath}/${tarName}`).exists(),
      bucket.file(`${basePath}/credentials.json`).exists(),
    ]);

    if (!tarExists)   throw new Error(`${tarName} chưa được upload`);
    if (!credsExists) throw new Error("credentials.json chưa được upload");

    // Đánh dấu ready — Mac build server tự pick up
    await update({ status: "pending", step: "pending" });
  } catch (err: any) {
    console.error(`[startBuild ${jobId}] ❌`, err.message);
    await update({
      status:       "failed",
      step:         "uploading",
      errorMessage: err.message,
    }).catch(() => {});
  }
}

// ── getBuildStatus ────────────────────────────────────────────────────────────
export async function getBuildStatus(jobId: string) {
  const snap = await getAdminDb().collection(BUILDS_COLLECTION).doc(jobId).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    jobId,
    status:    d.status,
    step:      d.step    ?? null,
    ipaUrl:    d.ipaUrl  ?? null,
    dsymUrl:   d.dsymUrl ?? null,
    error:     d.error   ?? null,
    createdAt: d.createdAt?.toDate().toISOString() ?? null,
    updatedAt: d.updatedAt?.toDate().toISOString() ?? null,
  };
}


