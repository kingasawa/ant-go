# Task: Fix Add Device Flow (CLI + Dashboard)

**Status:** done  
**Priority:** high  
**Created:** 2026-04-30  
**Branch:** feature/fix-add-device-flow  
**PR:** https://github.com/kingasawa/ant-go/pull/1

---

## Mục tiêu

Sửa lại toàn bộ flow thêm device trong CLI và Dashboard:

1. CLI fetch user info (plan, quota, devices) trước khi build
2. `distribution: internal` → hiển thị danh sách device đã có, cho chọn nhiều device, có option thêm mới
3. Device mới được lưu vào Firestore ngay sau khi enroll thành công
4. Provisioning Profile include tất cả device đã chọn (không chỉ 1)
5. Dashboard add device cũng lưu Firestore → CLI đọc được ở lần build sau

---

## Tiến độ

- [x] TASK-01 — API: Tạo `GET /api/user/me`
- [x] TASK-02 — API: Sửa `POST /api/devices` nhận CLI token
- [x] TASK-03 — CLI: Thêm `fetchUserInfo()` và `saveDevice()` vào `api.js`
- [x] TASK-04 — CLI: Sửa `build.js` — fetch user info và check quota
- [x] TASK-05 — CLI: Sửa `apple-creds.js` — multi-select device UI
- [x] TASK-06 — Cập nhật tài liệu

---

## Chi tiết subtask

### TASK-01 — API: Tạo endpoint `GET /api/user/me`

**File:** `app/api/user/me/route.ts` _(tạo mới)_  
**Auth:** CLI token (`validateCliToken`)

Endpoint trả thông tin **fresh** từ Firestore (không dùng data stale từ CLI token):

```
GET /api/user/me
Authorization: Bearer <cliToken>
```

Response:
```json
{
  "uid": "...",
  "email": "...",
  "plan": "free|starter|pro|team",
  "planStatus": "active|past_due|canceled|null",
  "freeBuildsRemaining": 5,
  "devices": [
    {
      "udid": "00008110-001234ABCDEF",
      "name": "My iPhone",
      "deviceProduct": "iPhone17,1",
      "deviceSerial": "XXXXX",
      "addedAt": "2026-04-30T..."
    }
  ]
}
```

Firestore reads:
- `users/{uid}` → lấy `plan`, `planStatus`, `freeBuildsRemaining`
- `users/{uid}/devices` (orderBy `addedAt` desc) → lấy danh sách devices

---

### TASK-02 — API: Sửa `POST /api/devices` chấp nhận CLI token

**File:** `app/api/devices/route.ts` _(sửa)_

Sửa hàm `resolveUid()` để hỗ trợ cả Firebase ID token lẫn CLI token:

```ts
async function resolveUid(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  // Thử Firebase ID token trước (dashboard)
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {}
  // Fallback: CLI token
  const session = await validateCliToken(token);
  return session?.uid ?? null;
}
```

Áp dụng cho cả `GET`, `POST`, `DELETE` trong file này.

---

### TASK-03 — CLI: Thêm `fetchUserInfo()` và `saveDevice()` vào `api.js`

**File:** `cli/src/api.js` _(sửa)_

Thêm 2 hàm:

```js
// Lấy user info + devices list (fresh từ Firestore)
async function fetchUserInfo(client) {
  const { data } = await client.get('/api/user/me');
  return data;
  // data: { uid, email, plan, planStatus, freeBuildsRemaining, devices[] }
}

// Lưu device mới vào Firestore sau khi enroll
async function saveDevice(client, { udid, name, deviceProduct, deviceSerial }) {
  const { data } = await client.post('/api/devices', {
    udid,
    name,
    deviceProduct,
    deviceSerial,
    source: 'cli',
  });
  return data;
}
```

Export cả 2 hàm mới.

---

### TASK-04 — CLI: Sửa `build.js` — fetch user info và check quota

**File:** `cli/src/commands/build.js` _(sửa)_

**Vị trí thay đổi:** Ngay sau `ensureToken()`, trước `resolveAntJson()`.

Thêm bước fetch và kiểm tra:

```js
// Fetch fresh user info
const infoSpinner = ora('Đang tải thông tin tài khoản...').start();
let userInfo;
try {
  userInfo = await fetchUserInfo(client);
  infoSpinner.succeed(
    `Plan: ${chalk.cyan(userInfo.plan)}  ·  ` +
    `Builds còn lại: ${chalk.bold(userInfo.freeBuildsRemaining)}`
  );
} catch (err) {
  infoSpinner.fail('Không tải được thông tin tài khoản');
  logger.error(err.response?.data?.error ?? err.message);
  process.exit(1);
}

// Kiểm tra quota
if (userInfo.plan === 'free' && userInfo.freeBuildsRemaining <= 0) {
  console.log('');
  console.log(chalk.red('✖  Bạn đã hết lượt build miễn phí.'));
  console.log(chalk.gray('   Nâng cấp tại: https://antgo.work/account/billing'));
  console.log('');
  process.exit(1);
}
if (userInfo.planStatus === 'past_due') {
  console.log(chalk.yellow('⚠  Thanh toán thất bại — vui lòng cập nhật thông tin thanh toán.'));
  console.log(chalk.gray('   https://antgo.work/account/billing'));
  console.log('');
}
```

Truyền `userInfo` xuống `ensureAppleCreds()`:

```js
creds = await ensureAppleCreds(projectInfo, {
  force: !!options.reauth,
  refreshProfile: !!options.refreshProfile,
  distribution,
  profileName,
  userDevices: userInfo.devices,   // ← thêm
  apiClient: client,               // ← thêm
});
```

Import thêm `fetchUserInfo` từ `api.js`.

---

### TASK-05 — CLI: Sửa `apple-creds.js` — multi-select device UI

**File:** `cli/src/apple-creds.js` _(sửa — phần lớn nhất)_

#### 5a. Thêm hàm `selectDevices(existingDevices, projectId, apiClient)`

Logic vòng lặp:

```
1. Build danh sách choices:
   - Mỗi device trong existingDevices → checkbox choice
   - Separator
   - "＋ Thêm device mới" → choice đặc biệt value = "__new__"

2. Hiện inquirer checkbox prompt (multi-select)

3. Nếu "__new__" nằm trong kết quả chọn:
   a. Gọi enrollDevice(projectId)  → { udid, deviceProduct, deviceSerial }
   b. Prompt: "Tên device (để nhận ra sau này):"
   c. Gọi apiClient → saveDevice({ udid, name, deviceProduct, deviceSerial })
      → lưu vào Firestore users/{uid}/devices/{udid}
   d. Thêm device mới vào existingDevices list (pre-checked)
   e. Quay lại bước 1 (loop)

4. Return: mảng các UDID được chọn (loại bỏ "__new__")
```

UI mẫu:
```
📱  Chọn device để build (Space = chọn/bỏ, Enter = xác nhận):

 ◉  My iPhone        iPhone17,1   (00008110-001234...)
 ◯  iPad Pro 11"     iPad8,1      (00008130-000ABC...)
 ─────────────────────────────────────────────
 ◯  ＋ Thêm device mới
```

#### 5b. Sửa `ensureAppleCreds()` — thêm params mới

```js
async function ensureAppleCreds(projectInfo, {
  force          = false,
  refreshProfile = false,
  distribution   = 'store',
  profileName    = 'production',
  userDevices    = [],    // ← mới: từ fetchUserInfo()
  apiClient      = null,  // ← mới: để gọi saveDevice()
} = {})
```

#### 5c. Sửa bước UDID enrollment (internal only)

Thay thế khối `enrollDevice()` cũ bằng `selectDevices()`:

```js
// Trước:
let udid, deviceId;
if (distribution === 'internal') {
  udid = await enrollDevice(projectInfo.projectId || projectInfo.bundleId);
  // ... register 1 device
}

// Sau:
let selectedUdids = [];
let deviceIds = [];
if (distribution === 'internal') {
  selectedUdids = await selectDevices(userDevices, projectInfo.projectId, apiClient);
  if (selectedUdids.length === 0) {
    console.log(chalk.red('✖  Phải chọn ít nhất 1 device.'));
    process.exit(1);
  }
  // Đăng ký từng UDID lên Apple Developer
  const deviceSpinner = ora('Đang đồng bộ devices lên Apple Developer...').start();
  for (const udid of selectedUdids) {
    const existing = allDevices.find(d => d.attributes?.udid?.toLowerCase() === udid.toLowerCase());
    if (existing) {
      deviceIds.push(existing.id);
    } else {
      const newDevice = await Device.createAsync(authCtx, { name: ..., udid, platform: 'IOS' });
      deviceIds.push(newDevice.id);
    }
  }
  deviceSpinner.succeed(`Đã đồng bộ ${deviceIds.length} device(s) lên Apple Developer`);
}
```

#### 5d. Sửa tạo Provisioning Profile

```js
// Trước:
devices: deviceId ? [deviceId] : []

// Sau:
devices: deviceIds   // array đầy đủ từ bước trên
```

#### 5e. Sửa cache — lưu `selectedUdids` thay vì 1 `udid`

```js
// Trước:
const creds = { appleId, p12Base64, p12Password, mobileprovisionBase64, teamId, udid };

// Sau:
const creds = { appleId, p12Base64, p12Password, mobileprovisionBase64, teamId, udids: selectedUdids };
```

---

### TASK-06 — Cập nhật tài liệu

**File:** `cli/docs/add-device-flow.md` _(viết lại)_

Cập nhật toàn bộ tài liệu theo flow mới:
- ASCII diagram với bước fetch user info
- Bước multi-select device
- Loop "thêm device mới"
- Array devices trong Provisioning Profile
- Cache format mới (`udids` thay vì `udid`)

---

## Thứ tự triển khai

```
TASK-01 (API /user/me)
    ↓
TASK-02 (API /devices CLI auth)
    ↓
TASK-03 (CLI api.js functions)
    ↓
TASK-04 (CLI build.js fetch + quota)
    ↓
TASK-05 (CLI apple-creds.js multi-select)
    ↓
TASK-06 (Cập nhật docs)
```

Các TASK-01 và TASK-02 độc lập nhau, có thể làm song song.  
TASK-03 phụ thuộc TASK-01 + TASK-02 (cần biết API shape).  
TASK-04 phụ thuộc TASK-03.  
TASK-05 phụ thuộc TASK-03.  
TASK-06 làm sau cùng.

---

## Ghi chú kỹ thuật

- `inquirer` version trong CLI hỗ trợ `checkbox` type → dùng cho multi-select.
- Cache file `~/.ant-go/creds-<profileName>.json` sẽ có thêm field `udids: string[]` thay cho `udid: string`. Cần backward-compat: nếu cache cũ có `udid` (string) → convert thành `udids: [udid]`.
- Khi `existingDevices` rỗng (user chưa có device nào) → bỏ qua màn hình chọn, đi thẳng vào enrollment mới.
- `saveDevice()` dùng `merge: true` trong Firestore → gọi nhiều lần cùng 1 UDID không bị lỗi.
- Apple Developer API limit: mỗi account free chỉ được tạo tối đa 100 device/năm. Cần reuse device đã có.
