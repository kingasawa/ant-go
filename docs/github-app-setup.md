# GitHub App Setup

Hướng dẫn tạo và cấu hình GitHub App để tích hợp với antgo.work — cho phép trigger build tự động khi push code hoặc tạo pull request.

---

## Tổng quan

```
GitHub.com                     antgo.work (Next.js)                  Firestore
     │                                  │                                  │
     ├── 1. Tạo GitHub App              │                                  │
     │                                  │                                  │
     │        User (web dashboard)      │                                  │
     │              │                   │                                  │
     │              ├── App Info page ──►│ PATCH /api/apps/{id}/github      │
     │              │   nhập owner/repo  │  xác thực Firebase ID token     │
     │              │                   │  kiểm tra 1-1 constraint         │
     │              │                   │  lưu githubRepo vào apps/{id} ───►│
     │                                  │                                  │
     ├── 2. User cài App vào repo ──────►│ POST /api/webhooks/github        │
     │      (installation webhook)      │  lưu github_installations ───────►│
     │                                  │                                  │
     ├── 3. User push code ─────────────►│ POST /api/webhooks/github        │
     │      (push event)                │  verify HMAC signature           │
     │                                  │  tìm app có githubRepo = repo ───►│ query apps
     │                                  │  tạo build job ──────────────────►│
     │◄── commit status update ─────────┘                                  │
```

**Quy tắc quan trọng:** Mỗi app trên antgo.work chỉ được connect với **đúng 1 GitHub repo**. Một repo cũng chỉ được connect với **đúng 1 app** của cùng user.

---

## Bước 1 — Tạo GitHub App trên GitHub.com

1. Vào **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Điền thông tin:

| Trường | Giá trị |
|---|---|
| **GitHub App name** | `antgo-ci` (hoặc tên tùy chọn) |
| **Homepage URL** | `https://antgo.work` |
| **Webhook URL** | `https://antgo.work/api/webhooks/github` |
| **Webhook secret** | Chuỗi random (dùng lệnh bên dưới để sinh) |

```bash
# Sinh webhook secret ngẫu nhiên
openssl rand -hex 32
```

3. **Callback URL** (cho OAuth web flow):
   ```
   https://antgo.work/api/github/callback
   ```

4. Bỏ tích **"Expire user authorization tokens"** nếu muốn token không hết hạn.

---

## Bước 2 — Cấu hình Permissions

### Repository permissions

| Permission | Mức | Lý do |
|---|---|---|
| **Contents** | Read | Đọc source code khi cần |
| **Metadata** | Read (bắt buộc) | Thông tin repo cơ bản |
| **Pull requests** | Read & write | Đăng comment kết quả build lên PR |
| **Commit statuses** | Read & write | Cập nhật trạng thái commit (pending / success / failure) |
| **Checks** | Read & write | Hiển thị kết quả build trong tab Checks của PR |

### Subscribe to events

Tích chọn các events sau:

- [x] **Push** — trigger build khi push lên branch
- [x] **Pull request** — trigger build khi mở/cập nhật PR
- [x] **Installation** — nhận thông báo khi user cài/gỡ App
- [x] **Create** — khi tạo branch hoặc tag mới

---

## Bước 3 — Tạo Private Key

Sau khi tạo App:

1. Cuộn xuống mục **Private keys** → Click **Generate a private key**.
2. GitHub tải về file `.pem` — lưu lại, **không commit vào git**.
3. Convert sang một dòng để dùng trong env:

```bash
# Hiển thị nội dung .pem thành 1 dòng (newline → \n)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-app.private-key.pem
```

---

## Bước 4 — Environment Variables

### `.env.local` (development)

```
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.abc123def456
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret_here
```

### `.env.production`

Dùng Google Secret Manager — thêm vào `env.yaml` (không commit):

```yaml
GITHUB_APP_ID: "123456"
GITHUB_APP_CLIENT_ID: "Iv1.abc123def456"
GITHUB_APP_CLIENT_SECRET: "your_client_secret_here"
GITHUB_APP_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_APP_WEBHOOK_SECRET: "your_webhook_secret_here"
```

### Lấy giá trị từ đâu?

| Biến | Lấy tại |
|---|---|
| `GITHUB_APP_ID` | GitHub App settings → App ID (số) |
| `GITHUB_APP_CLIENT_ID` | GitHub App settings → Client ID |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App settings → Generate a new client secret |
| `GITHUB_APP_PRIVATE_KEY` | File `.pem` đã tải ở Bước 3 |
| `GITHUB_APP_WEBHOOK_SECRET` | Chuỗi đã điền vào Webhook secret ở Bước 1 |

---

## Bước 5 — Kết nối App với GitHub Repo

### Quy tắc 1-1

Mỗi app trên antgo.work có một field `githubRepo` trong Firestore document `apps/{appId}`:

- Chỉ lưu một giá trị dạng `"owner/repo"` (hoặc `null` nếu chưa kết nối).
- Không có app nào của cùng user được có cùng `githubRepo`.
- Khi webhook `push` đến, server query `apps` theo `githubRepo` để biết cần trigger build cho app nào.

### UI — App Info page

User kết nối từ trang **App Info** (`/account/app/{appName}/app-info`):

1. Nhập repo theo định dạng `owner/repo` vào ô input.
2. Nhấn **Lưu** → gọi `PATCH /api/apps/{id}/github`.
3. Nếu repo đã được dùng bởi app khác → server trả lỗi 409.
4. Nhấn **Disconnect** → xoá liên kết, `githubRepo` về `null`.

### API Endpoint

**`PATCH /api/apps/[id]/github`**

Auth: Firebase ID token trong `Authorization: Bearer <token>` (lấy qua `user.getIdToken()` từ Firebase client SDK).

| Trường body | Kiểu | Mô tả |
|---|---|---|
| `repoFullName` | `string \| null` | `"owner/repo"` để connect, `null` để disconnect |

**Xử lý:**
1. Xác thực Firebase ID token.
2. Kiểm tra user sở hữu app (`apps/{id}.userId == uid`).
3. Validate format: phải khớp regex `^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$`.
4. Kiểm tra constraint 1-1: nếu user có app khác đã dùng cùng `repoFullName` → trả 409.
5. Cập nhật `apps/{id}` với `githubRepo = repoFullName`.

**Responses:**

| Status | Ý nghĩa |
|---|---|
| `200` | `{ ok: true, githubRepo: "owner/repo" \| null }` |
| `400` | Format sai |
| `401` | Chưa đăng nhập |
| `403` | App không thuộc về user này |
| `404` | App không tồn tại |
| `409` | Repo đã được connect với app khác |

---

## Bước 6 — Webhook Handler

**`POST /api/webhooks/github`** — nhận và xử lý events từ GitHub.

### Xác thực chữ ký (bắt buộc)

GitHub ký mỗi request bằng HMAC-SHA256 dùng `GITHUB_APP_WEBHOOK_SECRET`. Phải verify trước khi xử lý:

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyGithubSignature(body: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Trong route handler:
const sig = request.headers.get("x-hub-signature-256") ?? "";
const body = await request.text();
if (!verifyGithubSignature(body, sig, process.env.GITHUB_APP_WEBHOOK_SECRET!)) {
  return Response.json({ error: "Invalid signature" }, { status: 401 });
}
```

### Phân loại events

```typescript
const event = request.headers.get("x-github-event");
const payload = JSON.parse(body);

switch (event) {
  case "installation":
    if (payload.action === "created") await handleInstall(payload);
    if (payload.action === "deleted") await handleUninstall(payload);
    break;

  case "push":
    await handlePush(payload);
    break;

  case "pull_request":
    if (["opened", "synchronize", "reopened"].includes(payload.action)) {
      await handlePullRequest(payload);
    }
    break;
}
```

### Trigger build từ push event

Khi nhận `push`, tìm app có `githubRepo` khớp với repo gửi event, rồi tạo build job:

```typescript
async function handlePush(payload: GithubPushPayload) {
  const repoFullName = payload.repository.full_name; // "owner/repo"
  const db = getAdminDb();

  // Tìm app được connect với repo này
  const snap = await db
    .collection("apps")
    .where("githubRepo", "==", repoFullName)
    .limit(1)
    .get();

  if (snap.empty) return; // Không có app nào connect với repo này

  const appDoc = snap.docs[0];
  const appId = appDoc.id;
  const userId = appDoc.data().userId as string;

  // Tạo build job (tương tự POST /api/builds)
  await prepareBuild(appId, "ios", { autoSubmit: false, triggeredBy: "github_push", commitSha: payload.after });
}
```

---

## Bước 7 — Installation Flow

Khi user cài GitHub App vào repo của họ, GitHub gửi `installation` webhook:

```typescript
async function handleInstall(payload: GithubInstallationPayload) {
  await db.collection("github_installations").doc(String(payload.installation.id)).set({
    installationId:  payload.installation.id,
    accountLogin:    payload.installation.account.login,
    accountType:     payload.installation.account.type,
    appId:           payload.installation.app_id,
    repositoriesUrl: payload.installation.repositories_url,
    createdAt:       FieldValue.serverTimestamp(),
  });
}
```

---

## Bước 8 — Xác thực API với GitHub (JWT + Installation Token)

GitHub App xác thực qua 2 bước:

### Bước 8a — Tạo JWT từ Private Key

JWT có hiệu lực tối đa 10 phút, dùng để lấy Installation Token.

```typescript
import jwt from "jsonwebtoken";

function createAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID },
    process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    { algorithm: "RS256" }
  );
}
```

### Bước 8b — Lấy Installation Access Token

```typescript
async function getInstallationToken(installationId: number): Promise<string> {
  const appJwt = createAppJwt();
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const data = await res.json();
  return data.token; // Hết hạn sau 1 giờ
}
```

---

## Bước 9 — Cập nhật Commit Status

Sau khi build xong, cập nhật trạng thái commit trên GitHub:

```typescript
async function updateCommitStatus(
  installationId: number,
  owner: string,
  repo: string,
  sha: string,
  state: "pending" | "success" | "failure" | "error",
  buildId: string
) {
  const token = await getInstallationToken(installationId);
  await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      target_url: `https://antgo.work/account/builds/${buildId}`,
      description: state === "pending" ? "Build đang chạy..." : `Build ${state}`,
      context: "antgo/build",
    }),
  });
}
```

---

## Firestore Data Model

### `apps/{appId}` — field bổ sung

```
apps/{appId}
  ...fields hiện có...
  githubRepo: "owner/repo" | null   ← connect 1-1 với GitHub repo
  updatedAt:  timestamp
```

Field `githubRepo` được ghi qua `PATCH /api/apps/[id]/github`. Khi webhook `push` đến, server query `where("githubRepo", "==", repoFullName)` để tìm app cần trigger build.

### `github_installations/{installationId}` — mới

```
github_installations/{installationId}
  installationId:   number   ← ID từ GitHub
  accountLogin:     string   ← "username" hoặc "org-name"
  accountType:      "User" | "Organization"
  appId:            number   ← GitHub App ID
  repositoriesUrl:  string
  createdAt:        timestamp
```

---

## Các files liên quan

| File | Vai trò |
|---|---|
| `lib/appTypes.ts` | Interface `AppDoc` — có field `githubRepo?: string \| null` |
| `app/api/apps/[id]/github/route.ts` | `PATCH /api/apps/[id]/github` — connect / disconnect |
| `app/account/app/[appName]/app-info/page.tsx` | UI hiển thị trạng thái kết nối + form nhập repo |
| `app/api/webhooks/github/route.ts` | Webhook handler (cần implement) |

---

## Test Webhook Locally

Dùng **smee.io** để forward webhook từ GitHub về localhost:

```bash
# Cài smee client
npm install -g smee-client

# Forward events về localhost
smee --url https://smee.io/YOUR_CHANNEL_ID --target http://localhost:3000/api/webhooks/github
```

1. Vào [smee.io](https://smee.io) → **Start a new channel** → copy URL.
2. Cập nhật Webhook URL trong GitHub App settings thành URL smee.io.
3. Chạy lệnh smee ở trên.
4. Push code vào repo đã cài App → smee forward event về `localhost:3000`.

---

## Kiểm tra hoạt động

1. **Kết nối repo:**
   - Vào `/account/app/{appName}/app-info` → nhập `owner/repo` → nhấn **Lưu**.
   - Kiểm tra Firestore `apps/{id}` có field `githubRepo = "owner/repo"` không.
   - Thử nhập cùng repo cho app khác → phải báo lỗi 409.

2. **Cài GitHub App:**
   - GitHub App settings → Install App → chọn repo đã connect.
   - Kiểm tra Firestore `github_installations` có document mới không.

3. **Push code:**
   - Push một commit vào repo.
   - Kiểm tra Firestore `builds` có job mới với đúng `projectId` của app không.
   - Trên GitHub, tab **Commits** — phải có status indicator (⏳ pending → ✅/❌).

4. **Debug webhook:**
   - GitHub App settings → **Advanced → Recent Deliveries** → xem response từng event.
