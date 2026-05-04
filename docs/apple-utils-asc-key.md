# @expo/apple-utils — ASC API Key theo chương trình

## Tóm tắt nhanh

> **Có thể tạo và download ASC API Key (.p8) theo chương trình**, miễn là đã có
> Apple Developer Portal session (tức là đã login bằng Apple ID + 2FA).
>
> Đây là điều `@expo/apple-utils` cho phép làm — không cần vào giao diện web
> App Store Connect.

---

## Bối cảnh — 2 hệ thống Apple khác nhau

| | Apple Developer Portal | App Store Connect REST API |
|---|---|---|
| **URL** | `developer.apple.com` | `api.appstoreconnect.apple.com` |
| **Auth** | Apple ID + Password + 2FA (session cookie) | ASC API Key JWT (ES256) |
| **Quản lý** | Certificates, Profiles, Devices, Bundle IDs, **API Keys** | Upload builds, metadata, TestFlight... |
| **`@expo/apple-utils` dùng** | ✅ `Auth.loginAsync()` → session | ✅ JWT do user tự tạo |

**Điểm mấu chốt:** ASC API Keys được quản lý thông qua **Apple Developer Portal**
(không phải qua chính ASC REST API). Vì vậy, sau khi login bằng Apple ID, ta có thể
dùng `@expo/apple-utils` để tạo + download key — **cùng session** đã dùng để lấy
Certificate và Provisioning Profile.

---

## 2 cách dùng trong `@expo/apple-utils`

### Cách 1 — Class `ApiKey` (high-level, đang dùng trong ant-go)

```js
const { ApiKey, ApiKeyType } = require('@expo/apple-utils');

// List các key hiện có
const existingKeys = await ApiKey.getAsync(authCtx);
// → mảng key objects, mỗi object có { id, attributes: { nickname, roles, ... } }

// Tạo key mới
const newKey = await ApiKey.createAsync(authCtx, {
  nickname:       'ant-go',
  roles:          ['ADMIN'],      // hoặc ['APP_MANAGER']
  allAppsVisible: true,
  keyType:        ApiKeyType.PUBLIC_API,  // giá trị duy nhất: 'PUBLIC_API'
});
// → trả về key object, newKey.id là keyId

// Download .p8 (CHỈ được 1 lần — ngay sau khi tạo)
const privateKeyP8 = await newKey.downloadAsync();
// → string nội dung file .p8 (-----BEGIN PRIVATE KEY-----)

// Thu hồi key
await newKey.revokeAsync();
```

**Static methods:** `createAsync`, `getAsync`, `infoAsync`
**Instance methods:** `downloadAsync`, `revokeAsync`

### Cách 2 — Module `Keys` (lower-level, dùng trong eba-cli/asc.js)

```js
const { Keys } = require('@expo/apple-utils');

const keys    = await Keys.getKeysAsync(authState);
const newKey  = await Keys.createKeyAsync(authState, { name: 'my-key' });
const p8      = await Keys.downloadKeyAsync(authState, { id: newKey.id });
```

Về mặt kết quả, 2 cách là tương đương. `ApiKey` class là wrapper OOP ở trên `Keys`.

---

## Lấy `authCtx` ở đâu?

`authCtx` là kết quả của `Auth.loginAsync()` — đây là **cùng context** dùng để lấy
Certificate và Provisioning Profile trong ant-go:

```js
const { Auth, Teams } = require('@expo/apple-utils');

const result = await Auth.loginAsync({
  username: appleId,
  password: appSpecificPassword,
}, {
  onTwoFactorRequest: async () => {
    // prompt 2FA code từ user
    return code;
  },
});

const authCtx = result.context ?? result;

// Phải chọn team trước khi gọi bất kỳ API nào
await Teams.selectTeamAsync(authCtx, { teamId });

// Sau đó dùng authCtx cho cả Certificate, Profile, VÀ ApiKey
const cert     = await Certificate.getAsync(authCtx, ...);
const apiKeys  = await ApiKey.getAsync(authCtx);  // ← cùng authCtx
```

---

## Issuer ID — cách lấy tự động

`issuerId` không nằm trực tiếp trong key object, nhưng có thể thử đọc từ
`attributes.provider.id` của key đầu tiên trong danh sách:

```js
const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
const issuerId     = existingKeys[0]?.attributes?.provider?.id ?? null;
```

Nếu `null` (không tự lấy được) → phải prompt user nhập thủ công 1 lần.
`issuerId` là UUID hiển thị tại:
`App Store Connect → Users & Access → Integrations → App Store Connect API`

---

## Giới hạn và lưu ý kỹ thuật

| Điều kiện | Chi tiết |
|---|---|
| **Giới hạn số key** | Tối đa **10 PUBLIC_API keys** một lúc trên tất cả team members. Nếu đã đủ, `createAsync()` sẽ throw error. |
| **Download chỉ 1 lần** | `.p8` chỉ có thể download **ngay sau khi tạo**. Apple không lưu private key — không thể lấy lại sau đó. |
| **Key không tự hết hạn** | ASC API Key không có TTL — chỉ mất hiệu lực nếu bị revoke thủ công. |
| **`privateKeyP8` của key cũ** | Nếu key đã tồn tại (người dùng đã tạo trước đó), **không thể lấy lại private key**. Phải tạo key mới. |
| **Roles hợp lệ** | `ADMIN`, `APP_MANAGER`, `DEVELOPER`, `FINANCE`, `SALES`, `MARKETING`, `READ_ONLY`, `CUSTOMER_SUPPORT`, `ACCESS_TO_REPORTS`, v.v. (xem `UserRole` export). Dùng `ADMIN` cho full access. |
| **`keyType`** | Hiện tại chỉ có `ApiKeyType.PUBLIC_API = 'PUBLIC_API'`. |

---

## Pattern dùng trong ant-go (ensureAscKey)

```js
async function ensureAscKey(authCtx, teamId) {
  const { ApiKey, ApiKeyType } = require('@expo/apple-utils');
  const cacheFile = path.join(CACHE_DIR, `asc-key-${teamId}.json`);

  // 1. Đọc cache local (~/.ant-go/asc-key-{teamId}.json)
  let cached = null;
  if (fs.existsSync(cacheFile)) {
    try { cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
  }

  // 2. Verify cache còn hợp lệ trên Apple
  if (cached?.keyId && cached?.privateKeyP8) {
    const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
    const still = existingKeys.find(k => k.id === cached.keyId);
    if (still) return cached;           // ← dùng lại, không tạo mới
    fs.unlinkSync(cacheFile);           // key bị revoke → tạo mới
  }

  // 3. Tạo key mới
  const newKey = await ApiKey.createAsync(authCtx, {
    nickname: 'ant-go', roles: ['ADMIN'],
    allAppsVisible: true, keyType: ApiKeyType.PUBLIC_API,
  });
  const privateKeyP8 = await newKey.downloadAsync(); // CHỈ ở bước này mới có

  // 4. Lấy issuerId
  const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
  let issuerId = existingKeys[0]?.attributes?.provider?.id ?? null;
  if (!issuerId) {
    // fallback: prompt user nhập thủ công
  }

  // 5. Cache lại
  const result = { keyId: newKey.id, issuerId, privateKeyP8, _savedAt: Date.now() };
  fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), { mode: 0o600 });

  return result;
}
```

---

## Tham khảo — eba-cli (`/Projects/eba-cli`)

`/Projects/eba-cli` là project tham khảo đã dùng pattern này trong thực tế:

| File | Vai trò |
|---|---|
| `src/auth/apple.js` | `appleLogin()` + `appleLoginWithTeam()` — login + chọn team, hỗ trợ session restore (< 1h) |
| `src/api/asc-api.js` | `autoSetupApiKey()` — tạo + download key rồi lưu `~/.eba-cli/keys/AuthKey_{keyId}.p8`. Cũng implement JWT generator thủ công dùng `crypto.createSign('SHA256')` |
| `src/api/asc.js` | `Keys.getKeysAsync`, `Keys.createKeyAsync`, `Keys.downloadKeyAsync` — lower-level alternative |

**Đoạn mấu chốt trong `workflow.js`:**

```js
// Sau khi login và chọn team
const context = baseAuthState.context;

// Tạo key
const newKey = await ApiKey.createAsync(context, {
  nickname: 'eba-cli',
  roles: ['ADMIN'],
  allAppsVisible: true,
  keyType: ApiKeyType.PUBLIC_API,
});

// Download .p8 ngay lập tức
const privateKeyContent = await newKey.downloadAsync();

// Lưu file
fs.writeFileSync(`~/.eba-cli/keys/AuthKey_${newKey.id}.p8`, privateKeyContent);
```

---

## Những điều KHÔNG thể làm

| | |
|---|---|
| ❌ | Lấy private key của ASC key **đã tồn tại** (Apple không lưu trữ) |
| ❌ | Tạo/manage ASC key qua **ASC REST API** (ASC API không có endpoint để tự tạo key của nó) |
| ❌ | Dùng `p12` (Distribution Certificate) thay cho ASC API Key khi upload lên TestFlight |
| ✅ | Tạo key mới + download `.p8` ngay lập tức qua **Developer Portal session** |
| ✅ | List, revoke key qua Developer Portal session |

