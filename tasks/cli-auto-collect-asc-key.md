# Task: cli-auto-collect-asc-key

**Status:** `done`
**PR:** https://github.com/kingasawa/ant-go/pull/new/feature/cli-auto-collect-asc-key

## Mô tả

Khi user chạy `ant-go build` với `distribution: store` (dù có hay không có `--auto-submit`), sau
khi đăng nhập Apple, CLI tự động lấy (hoặc tạo mới) ASC API Key từ cùng session đó, rồi gửi
lên dashboard để lưu per-user, per-app.

Key được lưu tại `users/{uid}/app_store_keys/{appName}` — đúng chỗ mà luồng submit TestFlight
đọc — nên user không cần setup ASC key thủ công trên dashboard nữa.

---

## Phạm vi thay đổi

| File | Thay đổi |
|---|---|
| `cli/src/apple-creds.js` | Thêm `ensureAscKey(authCtx, teamId)` — gọi ngay sau bước chọn Team, chỉ khi `distribution === 'store'`. Trả thêm `ascKey` trong return value. |
| `cli/src/api.js` | Thêm function `uploadAscKey(client, { appName, keyId, issuerId, privateKeyP8 })` |
| `cli/src/commands/build.js` | Sau `createBuild()` thành công: nếu `creds.ascKey` và `appName` có, gọi `uploadAscKey()` (non-blocking) |
| `lib/build.service.ts` | `prepareBuild()` trả thêm `appName` |
| `app/api/builds/route.ts` | Forward `appName` trong response `POST /api/builds` |
| `app/api/user/asc-key/route.ts` | **NEW** — `POST /api/user/asc-key` auth bằng CLI token, upsert key vào Firestore |
| `docs/build-flow.md` | Cập nhật mô tả bước 2 (Apple credentials) và bước 3 (tạo build job) |

---

## Các quyết định thiết kế

### Lấy ASC key ở đâu?

**Bên trong `ensureAppleCreds()`**, sau bước chọn Team (lúc này `authCtx` và `teamId` đã có):

```
ensureAppleCreds()
  ├── login Apple  → authCtx
  ├── chọn Team    → teamId
  ├── [nếu distribution === 'store'] ensureAscKey(authCtx, teamId)  ← bước mới
  ├── cert / profile
  └── return { ...creds, ascKey }
```

Lý do không tách ra `build.js`: `authCtx` là Apple session object phức tạp, không cần
expose ra ngoài module.

### Cache ASC key

Cache tại `~/.ant-go/asc-key-{teamId}.json` (không có TTL — key không tự hết hạn):

```json
{
  "keyId": "XXXXX",
  "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "privateKeyP8": "-----BEGIN PRIVATE KEY-----\n...",
  "_savedAt": 1234567890
}
```

Logic:
1. Load cache → verify key vẫn tồn tại trên Apple (`ApiKey.getAsync()` → tìm `keyId`)
2. Nếu còn → return cached (không tạo mới)
3. Nếu không → `ApiKey.createAsync()` + `downloadAsync()` → save cache

**Cache hit path (`useCache = true`):** khi user dùng cache p12, cũng đọc ASC key cache
(không có `authCtx` nên không verify được — dùng luôn nếu file tồn tại).

### Issuer ID

`ApiKey.getAsync()` trả về list keys. Thử đọc `existingKeys[0]?.attributes?.provider?.id`.
Nếu null → prompt user nhập thủ công (giống cách eba-cli làm).

### Endpoint mới: `POST /api/user/asc-key`

Auth bằng CLI token (Bearer header). Lý do tạo route mới thay vì dùng
`POST /api/apps/{id}/app-store-key`:

- Route đó đòi Firebase ID token (browser session) — không dùng được từ CLI
- Không muốn thêm dual-auth vào route có sẵn (phức tạp, dễ sai)
- `POST /api/user/asc-key` rõ ràng, đơn trách nhiệm

Firestore path vẫn giống hệt: `users/{uid}/app_store_keys/{appName}` → submission flow
không cần thay đổi gì.

### Non-blocking

Toàn bộ bước upload ASC key trong `build.js` được bọc `try/catch`. Nếu fail → chỉ in
warning, không làm gián đoạn build.

---

## Subtasks

- [x] TASK-01  CLI — `ensureAscKey(authCtx, teamId)` trong `apple-creds.js`
- [x] TASK-02  Dashboard — `prepareBuild()` và `POST /api/builds` trả thêm `appName`
- [x] TASK-03  Dashboard — `POST /api/user/asc-key` (new route, CLI token auth)
- [x] TASK-04  CLI — `uploadAscKey()` trong `api.js` + integrate vào `build.js`
- [x] TASK-05  Docs — cập nhật `docs/build-flow.md`

---

## Chi tiết từng subtask

### TASK-01 — `ensureAscKey(authCtx, teamId)`

**File:** `cli/src/apple-creds.js`

Thêm function `ensureAscKey(authCtx, teamId)`:

```js
async function ensureAscKey(authCtx, teamId) {
  const { ApiKey, ApiKeyType } = require('@expo/apple-utils');
  const cacheFile = path.join(CACHE_DIR, `asc-key-${teamId}.json`);
  const ora = require('ora');

  // 1. Kiểm tra cache
  let cached = null;
  if (fs.existsSync(cacheFile)) {
    try { cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
  }

  // 2. Nếu có cache → verify còn tồn tại trên Apple
  if (cached?.keyId && cached?.privateKeyP8) {
    try {
      const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
      const still = existingKeys.find(k => k.id === cached.keyId);
      if (still) {
        console.log(chalk.green(`✔  ASC API Key (cached): ${cached.keyId}`));
        return cached;
      }
      // Key bị xoá trên Apple → xoá cache, tạo mới
      fs.unlinkSync(cacheFile);
    } catch (e) {
      // Không verify được → dùng cache
      return cached;
    }
  }

  // 3. Tạo key mới
  const spinner = ora('Đang tạo App Store Connect API Key...').start();
  try {
    const newKey = await ApiKey.createAsync(authCtx, {
      nickname: 'ant-go',
      roles: ['ADMIN'],
      allAppsVisible: true,
      keyType: ApiKeyType.PUBLIC_API,
    });

    const privateKeyP8 = await newKey.downloadAsync();
    if (!privateKeyP8) throw new Error('Download .p8 trả về rỗng');

    // 4. Lấy issuerId
    let issuerId = null;
    try {
      const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
      issuerId = existingKeys[0]?.attributes?.provider?.id ?? null;
    } catch {}

    if (!issuerId) {
      spinner.stop();
      console.log(chalk.yellow('\n⚠  Không tự lấy được Issuer ID — nhập thủ công:'));
      console.log(chalk.gray('   App Store Connect → Users & Access → Integrations → App Store Connect API'));
      const inquirer = require('inquirer');
      const { inputIssuerId } = await inquirer.prompt([{
        type: 'input', name: 'inputIssuerId',
        message: 'Issuer ID (UUID):',
        validate: v => v.trim() ? true : 'Bắt buộc',
      }]);
      issuerId = inputIssuerId.trim();
      spinner.start();
    }

    const result = { keyId: newKey.id, issuerId, privateKeyP8, _savedAt: Date.now() };
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), { mode: 0o600 });
    spinner.succeed(`ASC API Key tạo thành công: ${newKey.id}`);
    return result;

  } catch (err) {
    spinner.warn(`Không lấy được ASC API Key: ${err.message}`);
    return null;
  }
}
```

Gọi trong `ensureAppleCreds()` ngay sau **bước chọn Team**,
chỉ khi `distribution === 'store'`:

```js
let ascKey = null;
if (distribution === 'store') {
  ascKey = await ensureAscKey(authCtx, teamId);
}
```

Trong return value ở cuối hàm, thêm `ascKey`:

```js
const creds = { appleId, p12Base64, p12Password, mobileprovisionBase64, teamId, udids, ascKey };
saveCache(creds, profileName);
```

**Cache hit path** (dòng `return { ...cached, ...projectInfo }`): cache đã chứa `ascKey`
từ lần đăng nhập trước (nếu có). Không cần xử lý thêm.

Export function:

```js
module.exports = { ensureAppleCreds, ensureAscKey, loadCache, clearCache, getCacheFile };
```

---

### TASK-02 — `prepareBuild()` trả thêm `appName`

**File:** `lib/build.service.ts`

Trong `prepareBuild()`, thêm `appName` vào return value:

```ts
return { jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName: projectSnap.data()?.name ?? null };
```

**File:** `app/api/builds/route.ts`

Destructure và forward `appName`:

```ts
const { jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName } = await prepareBuild(...)
return NextResponse.json({ jobId, tarUrl, credsUrl, buildNumber: resolvedBuildNumber, appName }, { status: 201 });
```

---

### TASK-03 — `POST /api/user/asc-key`

**File:** `app/api/user/asc-key/route.ts` (**mới**)

```ts
/**
 * POST /api/user/asc-key
 * Auth: CLI token (Bearer)
 * Body: { appName, keyId, issuerId, privateKeyP8 }
 *
 * Lưu ASC API Key vào users/{uid}/app_store_keys/{appName}
 * (cùng path mà submission flow đọc)
 */
```

- Xác thực qua `validateCliToken(token)` → lấy `session.uid`
- Validate body: `appName`, `keyId`, `issuerId`, `privateKeyP8` đều phải có
- Validate `privateKeyP8` chứa `BEGIN` và `KEY`
- `encryptAscKey(privateKeyP8.trim())` → lưu vào Firestore
- Trả `{ ok: true }`

---

### TASK-04 — `uploadAscKey()` + integrate `build.js`

**File:** `cli/src/api.js`

Thêm function:

```js
async function uploadAscKey(client, { appName, keyId, issuerId, privateKeyP8 }) {
  return client.post('/api/user/asc-key', { appName, keyId, issuerId, privateKeyP8 });
}
module.exports = { ..., uploadAscKey };
```

**File:** `cli/src/commands/build.js`

Import `uploadAscKey`:

```js
const { createClient, createBuild, getBuildStatus, fetchUserInfo, uploadAscKey } = require('../api');
```

Sau bước `createBuild()` thành công (đã có `jobId`, `appName`), thêm đoạn upload ASC key
(non-blocking):

```js
const appName = res.appName;   // từ response API

// Upload ASC key lên dashboard (best-effort, không block build)
if (platform === 'ios' && creds?.ascKey && appName) {
  const { keyId, issuerId, privateKeyP8 } = creds.ascKey;
  try {
    await uploadAscKey(client, { appName, keyId, issuerId, privateKeyP8 });
    console.log(chalk.green('✔  ASC API Key đã lưu vào dashboard'));
  } catch (err) {
    console.log(chalk.yellow('⚠  Không lưu được ASC API Key: ') + chalk.gray(err.message));
  }
}
```

---

### TASK-05 — Cập nhật `docs/build-flow.md`

Cập nhật **Bước 2** (Apple credentials): thêm mô tả bước `ensureAscKey()`.

Cập nhật **Bước 3** (tạo build job): thêm `appName` vào response.

Thêm **mục riêng** giải thích cơ chế tự động thu thập ASC key và lợi ích
(không cần setup thủ công trên dashboard).

---

## Lưu ý & rủi ro

| Vấn đề | Xử lý |
|---|---|
| Apple giới hạn 10 PUBLIC_API key/team | `ApiKey.createAsync()` throw error → `ensureAscKey` catch → return `null` → build vẫn tiếp tục, chỉ warning |
| Key đã tồn tại trên Apple nhưng không có private key | Không lấy lại được — phải tạo key mới. Nếu đã đủ 10 key → warning, skip |
| `issuerId` không lấy được tự động | Prompt user nhập thủ công (1 lần, rồi cache) |
| User đang dùng cache p12 (không có authCtx) | `ascKey` lấy từ cache file nếu có; nếu không có → null → skip upload, không lỗi |
| Route mới `app/api/user/asc-key/` | Kiểm tra không có dynamic segment conflict. `app/api/user/` hiện chỉ có `me/` — an toàn |
| `privateKeyP8` truyền qua HTTP | Kết nối luôn HTTPS trên production. Local dev có thể HTTP — chấp nhận được |

