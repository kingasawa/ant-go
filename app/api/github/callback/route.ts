/**
 * GET /api/github/callback
 * Query: { installation_id, setup_action, state }
 *
 * GitHub redirect về đây sau khi user cài App.
 * 1. Validate state token
 * 2. Verify repo nằm trong danh sách repos của installation
 * 3. Lưu installation, cập nhật apps/{id}.githubRepo
 * 4. Redirect về app-info page
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createSign } from "crypto";

function createAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (s: string) =>
    Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID }));
  const signingInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const sig = sign.sign(process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"), "base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${signingInput}.${sig}`;
}

async function getInstallationToken(installationId: number): Promise<string> {
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${createAppJwt()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const data = await res.json();
  if (!data.token) throw new Error("Failed to get installation token");
  return data.token;
}

async function listInstallationRepos(installationToken: string): Promise<string[]> {
  const repos: string[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${installationToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    const data = await res.json();
    if (!Array.isArray(data.repositories) || data.repositories.length === 0) break;
    repos.push(...data.repositories.map((r: { full_name: string }) => r.full_name));
    if (data.repositories.length < 100) break;
    page++;
  }
  return repos;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const state         = searchParams.get("state");
  const base          = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!installationId || !state) {
    return NextResponse.redirect(`${base}/account?github_error=missing_params`);
  }

  const db = getAdminDb();
  const stateDoc = await db.collection("github_connect_states").doc(state).get();

  if (!stateDoc.exists) {
    return NextResponse.redirect(`${base}/account?github_error=invalid_state`);
  }

  const { antgoAppId, repoFullName, redirectAfter, expiresAt } = stateDoc.data()!;

  if ((expiresAt.toDate() as Date) < new Date()) {
    await stateDoc.ref.delete();
    return NextResponse.redirect(`${base}${redirectAfter}?github_error=state_expired`);
  }

  try {
    const idNum = parseInt(installationId, 10);
    const installationToken = await getInstallationToken(idNum);
    const accessibleRepos   = await listInstallationRepos(installationToken);

    if (!accessibleRepos.map((r) => r.toLowerCase()).includes(repoFullName.toLowerCase())) {
      await stateDoc.ref.delete();
      return NextResponse.redirect(`${base}${redirectAfter}?github_error=repo_not_accessible`);
    }

    // Lấy thông tin installation để lưu
    const instRes  = await fetch(`https://api.github.com/app/installations/${idNum}`, {
      headers: {
        Authorization: `Bearer ${createAppJwt()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const instData = await instRes.json();

    await db.collection("github_installations").doc(String(idNum)).set({
      installationId: idNum,
      accountLogin:   instData.account?.login ?? null,
      accountType:    instData.account?.type  ?? null,
      appId:          instData.app_id         ?? null,
      repositoriesUrl: instData.repositories_url ?? null,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("apps").doc(antgoAppId).update({
      githubRepo:            repoFullName,
      githubInstallationId:  idNum,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await stateDoc.ref.delete();
    return NextResponse.redirect(`${base}${redirectAfter}?github_connected=1`);
  } catch (err) {
    console.error("[github/callback]", err);
    await stateDoc.ref.delete();
    return NextResponse.redirect(`${base}${redirectAfter}?github_error=callback_failed`);
  }
}
