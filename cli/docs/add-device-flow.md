# Add Device Flow — CLI

Luồng đăng ký UDID thiết bị iOS từ CLI, được kích hoạt tự động khi chạy `ant-go build` với profile `distribution: internal`.

---

## Tổng quan

```
Developer Machine (CLI)              antgo.work API                 iPhone
        │                                  │                           │
        ├── ant-go build --profile development                         │
        ├── đọc ant.json → distribution: internal                      │
        ├── đăng nhập Apple Developer                                  │
        │                                  │                           │
        ├── POST /api/device-enroll/create►│ tạo enrollment session    │
        │◄── { token, enrollUrl } ─────────┤                           │
        ├── hiển thị QR code trong terminal│                           │
        │                                  │                           │
        │                                  │◄── iPhone quét QR ────────┤
        │                                  │    tải .mobileconfig      │
        │                                  │◄── iOS gửi UDID ──────────┤
        │                                  │    cập nhật Firestore     │
        │                                  │                           │
        ├── poll /api/device-enroll/{token}/status (3s)                │
        │◄── { status: "registered", udid } ◄───────────────────────────
        │                                  │                           │
        ├── kiểm tra UDID trên Apple Developer Portal                  │
        ├── (nếu chưa có) hỏi tên device → Device.createAsync()        │
        ├── tiếp tục lấy Certificate + Provisioning Profile            │
        └── gửi build job lên server                                   │
```

---

## Điều kiện kích hoạt

Flow này chỉ chạy khi cả hai điều kiện sau đều đúng:

1. `--platform ios`
2. Profile được chọn có `distribution: "internal"` trong `ant.json`

```json
// ant.json
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
| `cli/src/commands/build.js` | Entry point — đọc profile, gọi `ensureAppleCreds()` |
| `cli/src/apple-creds.js` | Toàn bộ logic Apple credentials, bao gồm `enrollDevice()` |
| `app/api/device-enroll/create/route.ts` | Tạo enrollment session trong Firestore |
| `app/api/device-enroll/[token]/profile/route.ts` | Trả `.mobileconfig` cho iPhone |
| `app/api/device-enroll/[token]/complete/route.ts` | Nhận UDID từ iOS |
| `app/api/device-enroll/[token]/status/route.ts` | CLI poll để biết khi nào UDID về |

---

## Flow chi tiết

### Bước 1 — CLI đọc profile

`build.js` gọi `resolveAntJson(projectRoot, profileName)` để lấy config của profile:

```js
// Kết quả trả về:
{
  distribution: "internal",   // ← kích hoạt device enrollment
  developmentClient: true
}
```

Nếu `ant.json` chưa tồn tại, CLI tự tạo với 3 profile mặc định (`production`, `development`, `preview`).

---

### Bước 2 — Đăng nhập Apple Developer

`ensureAppleCreds()` trong `apple-creds.js` xử lý theo thứ tự:

1. **Kiểm tra cache** tại `~/.ant-go/creds-<profileName>.json` (TTL 24h).
   - Cache còn hợp lệ → hỏi user có muốn dùng lại không.
   - User chọn "tài khoản khác" hoặc cache hết hạn → xoá cache, tiếp tục.

2. **Prompt Apple ID + App-Specific Password** qua `inquirer`.

3. **Login** qua `@expo/apple-utils` `Auth.loginAsync()`:
   - Hỗ trợ 2FA — nếu Apple yêu cầu, CLI dừng lại và hỏi mã 6 chữ số.

4. **Chọn team** nếu account có nhiều team.

---

### Bước 3 — Tạo enrollment session

`enrollDevice(projectId)` trong `apple-creds.js` gọi:

```
POST https://antgo.work/api/device-enroll/create
Body: { projectId: "..." }
```

Server tạo document trong Firestore:
```
device_enrollments/{uuid}
  status:    "pending"
  projectId: "..."
  source:    "cli"
  createdAt: <timestamp>
  expiresAt: <+10 phút>
  udid:      null
```

Response trả về:
```json
{ "token": "uuid", "enrollUrl": "https://antgo.work/api/device-enroll/{token}/profile" }
```

---

### Bước 4 — Hiển thị QR code trong terminal

CLI dùng thư viện `qrcode-terminal` để render `enrollUrl` trực tiếp trong terminal:

```
Quét QR code bằng Camera app trên iPhone:

  ██████████████  ██  ██████████████
  ██          ██  ██  ██          ██
  ██  ██████  ██      ██  ██████  ██
  ...

Hoặc mở URL: https://antgo.work/api/device-enroll/{token}/profile

Đang chờ iPhone xác nhận...
```

Đồng thời bắt đầu poll `GET /api/device-enroll/{token}/status` mỗi **3 giây**, hiển thị countdown còn bao nhiêu phút.

---

### Bước 5 — iPhone quét QR → tải .mobileconfig

iPhone mở Safari từ Camera app, truy cập `enrollUrl`.

Server trả về file `.mobileconfig` với:
```
Content-Type: application/x-apple-aspen-config
```

Đây là **Profile Service** plist — iOS dùng để thu thập UDID từ thiết bị. iOS hiển thị hộp thoại "Cài đặt Profile", sau khi user cho phép:

- iOS **tự động POST** một CMS-signed plist về `completeUrl` chứa `UDID`, `SERIAL`, `PRODUCT`, `IMEI`.
- Server extract UDID và cập nhật Firestore: `status = "registered"`, `udid = "..."`.

---

### Bước 6 — CLI nhận UDID

Poll tại `GET /api/device-enroll/{token}/status` trả về:
```json
{ "status": "registered", "udid": "00008110-001234ABCDEF", "deviceProduct": "iPhone17,1" }
```

CLI hiển thị:
```
✔ Device đã xác nhận: iPhone17,1  (00008110-001234ABCDEF)
```

**Timeout:** 10 phút — nếu quá thời gian, CLI báo lỗi và thoát.

---

### Bước 7 — Đăng ký UDID lên Apple Developer Portal

Sau khi có UDID, CLI dùng `@expo/apple-utils` để kiểm tra và đăng ký:

```js
const devices = await Device.getAsync(authCtx, {});
const existing = devices.find(d => d.attributes?.udid?.toLowerCase() === udid.toLowerCase());
```

**Nếu device đã đăng ký trên Apple Developer:**
```
✔ Device đã đăng ký: My iPhone
```
→ Dùng lại `deviceId` của device đó.

**Nếu device chưa đăng ký:**
- Prompt hỏi tên thiết bị (mặc định: "My iPhone").
- Gọi `Device.createAsync()` để đăng ký lên Apple Developer Portal.
```
✔ Device đã đăng ký: My iPhone
```

---

### Bước 8 — Lấy Certificate và Provisioning Profile

Sau khi có `deviceId`, CLI tiếp tục flow bình thường:

1. **Development Certificate** (`CertificateType.DEVELOPMENT`):
   - Reuse nếu có cert còn hiệu lực.
   - Tạo mới nếu không có → export `.p12`.

2. **Development Provisioning Profile** (`ProfileType.IOS_APP_DEVELOPMENT`):
   - Reuse nếu profile đang ACTIVE và khớp cert + bundle ID.
   - Tạo lại nếu cert mới hoặc profile không hợp lệ.
   - **Profile tạo mới bao gồm `deviceId` vừa đăng ký** → app cài được lên device này.

3. **Lưu cache** kết quả vào `~/.ant-go/creds-development.json` (TTL 24h).

---

### Bước 9 — Tiếp tục build

CLI đóng gói project, upload lên GCS và gửi build job — giống hệt flow build bình thường (xem [build-flow.md](../../docs/build-flow.md)).

---

## Cache credentials

CLI cache Apple credentials tại `~/.ant-go/creds-<profileName>.json`:

```json
{
  "appleId": "dev@example.com",
  "p12Base64": "...",
  "p12Password": "...",
  "mobileprovisionBase64": "...",
  "teamId": "TEAMID123",
  "udid": "00008110-001234ABCDEF",
  "_savedAt": 1714512345678
}
```

- TTL: **24 giờ** — sau đó cache bị xoá tự động khi đọc.
- File mode: `0600` (chỉ owner đọc được).
- Nếu có cache còn hiệu lực → CLI hỏi có dùng lại không.

Xoá cache thủ công:
```bash
rm ~/.ant-go/creds-development.json
```

Hoặc chạy với flag `--reauth` để bỏ qua cache:
```bash
ant-go build --platform ios --profile development --reauth
```

---

## Sơ đồ quyết định device enrollment

```
ensureAppleCreds() được gọi
        │
        ▼
distribution === "internal" ?
        │ Có                    Không → bỏ qua enrollDevice(), dùng cert store
        ▼
enrollDevice(projectId)
  POST /api/device-enroll/create
  Hiện QR code trong terminal
  Poll status mỗi 3s (max 10 phút)
        │
        ▼ udid nhận được
Device.getAsync(authCtx)
        │
        ├── UDID đã tồn tại? → dùng deviceId hiện có
        │
        └── Chưa có → prompt tên → Device.createAsync() → lấy deviceId mới
        │
        ▼
Profile.createAsync({ devices: [deviceId], ... })
Device được include trong Provisioning Profile
```

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Device enrollment timeout` | iPhone không quét QR trong 10 phút | Chạy lại lệnh, quét QR nhanh hơn |
| `Không tạo được enrollment session` | Mất kết nối đến antgo.work | Kiểm tra mạng, thử lại |
| `App ID không tồn tại trên Apple Developer` | `bundleId` trong app.json chưa được tạo trên portal | Tạo App ID thủ công tại developer.apple.com |
| `Đăng nhập thất bại` | Sai Apple ID / password | Kiểm tra App-Specific Password tại appleid.apple.com |
| `Không tìm thấy Apple Developer team` | Account chưa accept Apple Developer Agreement | Đăng nhập developer.apple.com và accept agreement |
