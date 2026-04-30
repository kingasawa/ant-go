# Add Device Flow — CLI

Luồng đăng ký UDID thiết bị iOS từ CLI, được kích hoạt tự động khi chạy `ant-go build` với profile `distribution: internal`.

---

## Tổng quan

```
Developer Machine (CLI)              antgo.work API                 iPhone
        │                                  │                           │
        ├── ant-go build --profile development                         │
        ├── ensureToken()                  │                           │
        │                                  │                           │
        ├── GET /api/user/me ─────────────►│ trả plan, quota, devices  │
        │◄── { plan, freeBuildsRemaining,  │                           │
        │      devices: [...] } ───────────┤                           │
        ├── check quota (free builds?)     │                           │
        │                                  │                           │
        ├── distribution: internal?        │                           │
        │       └─ selectDevices()         │                           │
        │           ├─ multi-select UI     │                           │
        │           └─ "Thêm device mới":  │                           │
        │               POST /device-enroll/create                     │
        │◄── { token, enrollUrl } ─────────┤                           │
        │               hiện QR code       │                           │
        │               poll status 3s     │◄── iPhone quét QR ────────┤
        │                                  │    iOS gửi UDID           │
        │◄── { status: registered, udid } ◄┤                           │
        │               POST /api/devices ►│ lưu Firestore             │
        │               loop lại chọn      │                           │
        │                                  │                           │
        ├── Apple login (cache / fresh)    │                           │
        ├── sync UDIDs → Apple Developer (Device.getAsync / createAsync)
        ├── Certificate (reuse / tạo mới)  │                           │
        ├── Provisioning Profile({ devices: [id1, id2, ...] })         │
        └── createBuild → upload → start   │                           │
```

---

## Điều kiện kích hoạt

Flow này chỉ chạy khi cả hai điều kiện đều đúng:

1. `--platform ios`
2. Profile được chọn có `distribution: "internal"` trong `ant.json`

```json
{
  "build": {
    "development": {
      "distribution": "internal",
      "developmentClient": true
    }
  }
}
```

Lệnh kích hoạt:
```bash
ant-go build --platform ios --profile development
```

---

## Các file liên quan

| File | Vai trò |
|---|---|
| `cli/src/commands/build.js` | Entry point — fetch user info, check quota, gọi `ensureAppleCreds()` |
| `cli/src/api.js` | `fetchUserInfo()`, `saveDevice()` |
| `cli/src/apple-creds.js` | `enrollDevice()`, `selectDevices()`, `ensureAppleCreds()` |
| `app/api/user/me/route.ts` | Trả user info + danh sách devices (fresh từ Firestore) |
| `app/api/device-enroll/create/route.ts` | Tạo enrollment session |
| `app/api/device-enroll/[token]/profile/route.ts` | Trả `.mobileconfig` cho iPhone |
| `app/api/device-enroll/[token]/complete/route.ts` | Nhận UDID từ iOS |
| `app/api/device-enroll/[token]/status/route.ts` | CLI poll để biết UDID về chưa |
| `app/api/devices/route.ts` | Lưu / đọc devices — chấp nhận cả Firebase ID token lẫn CLI token |

---

## Flow chi tiết

### Bước 1 — Fetch user info

Ngay sau `ensureToken()`, CLI gọi `GET /api/user/me` với CLI token:

```
Response: {
  plan: "free|starter|pro|team",
  planStatus: "active|past_due|canceled|null",
  freeBuildsRemaining: 5,
  devices: [
    { udid, name, deviceProduct, deviceSerial, addedAt }
  ]
}
```

Kiểm tra quota:
- `plan === "free"` và `freeBuildsRemaining <= 0` → báo lỗi, thoát.
- `planStatus === "past_due"` → hiện cảnh báo thanh toán, tiếp tục.

---

### Bước 2 — Multi-select device (`selectDevices`)

Khi `distribution: internal`, CLI gọi `selectDevices(userDevices, projectId, apiClient)`.

**Trường hợp chưa có device nào:** đi thẳng vào enrollment mới.

**Trường hợp đã có device:** hiển thị checkbox multi-select:

```
📱  Chọn device để build (Space = chọn/bỏ, Enter = xác nhận):

 ◉  My iPhone        iPhone17,1   (00008110-001234...)
 ◯  iPad Pro 11"     iPad8,1      (00008130-000ABC...)
 ─────────────────────────────────────────────────────
 ◯  ＋ Thêm device mới
```

**Nếu user chọn "＋ Thêm device mới":**

1. Chạy `enrollDevice(projectId)`:
   - `POST /api/device-enroll/create` → nhận `token`, `enrollUrl`
   - Hiện QR code trong terminal
   - Poll `GET /api/device-enroll/{token}/status` mỗi 3 giây (max 10 phút)
   - Nhận `{ udid, deviceProduct, deviceSerial }`
2. Prompt tên device.
3. `POST /api/devices` → lưu vào Firestore `users/{uid}/devices/{udid}`.
4. Thêm device mới vào danh sách, **quay lại màn hình chọn**.

Return: `string[]` — mảng các UDID được chọn.

---

### Bước 3 — Đăng nhập Apple Developer

`ensureAppleCreds()` xử lý cache (TTL 24h) → login → 2FA → chọn team.

---

### Bước 4 — Đồng bộ UDIDs lên Apple Developer Portal

Với mỗi UDID trong `selectedUdids`:

```
Device.getAsync(authCtx)
    ├── UDID đã có trên Apple? → lấy deviceId
    └── Chưa có → Device.createAsync({ name, udid, platform: 'IOS' }) → lấy deviceId mới

deviceIds = [id1, id2, ...]
```

---

### Bước 5 — Certificate + Provisioning Profile

- **Certificate** (Development): reuse nếu còn hợp lệ, tạo mới nếu không.
- **Provisioning Profile** (Development): tạo với **toàn bộ** `deviceIds`:
  ```js
  Profile.createAsync(authCtx, {
    bundleId:     bundleIdObj.id,
    certificates: [certId],
    devices:      deviceIds,   // tất cả device đã chọn
    profileType:  ProfileType.IOS_APP_DEVELOPMENT,
  })
  ```

---

### Bước 6 — Build

CLI đóng gói project, upload lên GCS và gửi build job — giống hệt flow build bình thường (xem [../../docs/build-flow.md](../../docs/build-flow.md)).

---

## Cache credentials

File: `~/.ant-go/creds-<profileName>.json` (TTL 24h, mode 0600)

```json
{
  "appleId": "dev@example.com",
  "p12Base64": "...",
  "p12Password": "...",
  "mobileprovisionBase64": "...",
  "teamId": "TEAMID123",
  "udids": ["00008110-001234ABCDEF", "00008130-000ABC123"],
  "_savedAt": 1714512345678
}
```

**Backward compat:** cache cũ có field `udid` (string) vẫn được đọc, convert thành `udids: [udid]`.

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Bạn đã hết lượt build miễn phí` | `freeBuildsRemaining <= 0` | Nâng cấp plan tại antgo.work/account/billing |
| `Device enrollment timeout` | iPhone không quét QR trong 10 phút | Chạy lại lệnh, quét QR nhanh hơn |
| `Không tạo được enrollment session` | Mất kết nối đến antgo.work | Kiểm tra mạng, thử lại |
| `App ID không tồn tại trên Apple Developer` | `bundleId` chưa được tạo trên portal | Tạo App ID thủ công tại developer.apple.com |
| `Đăng nhập thất bại` | Sai Apple ID / password | Kiểm tra App-Specific Password tại appleid.apple.com |
