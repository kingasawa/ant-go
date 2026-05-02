# Tính năng Add Device — Tài liệu kỹ thuật

## 1. Tổng quan

Tính năng cho phép user đăng ký UDID của iPhone vào tài khoản Ant Go thông qua QR code, không cần nhập thủ công. Dashboard tạo một phiên enrollment tạm thời, user quét QR bằng iPhone, iOS tự động thu thập và gửi UDID về server.

---

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 15 App Router, React (Client Component) |
| Backend API | Next.js Route Handlers |
| Database | Firebase Firestore (Admin SDK cho server, không dùng client SDK) |
| Auth | Firebase Auth ID Token + CLI token (dual auth) |
| Profile signing | `node-forge` — CMS/PKCS#7 SignedData |
| Certificate | Self-signed RSA 2048, hết hạn 2036-04-29 |
| Deploy | Google App Engine via Cloud Build trigger |
| Secrets | Google Secret Manager (`PROFILE_SIGNING_CERT`, `PROFILE_SIGNING_KEY`) |
| QR Code | `qrcode` npm package (client-side) |

---

## 3. Các thành phần

```
app/
├── (account)/account/devices/page.tsx          # Dashboard UI — danh sách + modal
├── enroll/[token]/page.tsx                      # Landing page trên iPhone
├── api/
│   ├── device-enroll/
│   │   ├── create/route.ts                      # Tạo enrollment session
│   │   ├── [token]/profile/route.ts             # Serve .mobileconfig đã ký
│   │   ├── [token]/complete/route.ts            # Nhận UDID từ iOS
│   │   └── [token]/status/route.ts              # Poll trạng thái
│   └── devices/route.ts                         # CRUD device list
└── .well-known/acme-challenge/[token]/route.ts  # ACME HTTP-01 challenge

lib/
└── profile-signing.ts                           # CMS signing với node-forge

scripts/
├── acme-auth-hook.js                            # certbot hook — ghi challenge vào Firestore
└── acme-cleanup-hook.js                         # certbot hook — xoá challenge
```

---

## 4. Quy trình hoạt động

### Bước 1 — Dashboard tạo enrollment session

```
User bấm "Thêm device"
→ POST /api/device-enroll/create  (Bearer: Firebase ID Token)
→ Server xác thực user (resolveUid)
→ Tạo doc trong Firestore: device_enrollments/{uuid}
   { userId, status: "pending", expiresAt: now+10min, ... }
→ Trả về { token, enrollUrl }
→ Dashboard tạo QR code từ URL: /enroll/{token}
→ Bắt đầu poll /api/device-enroll/{token}/status mỗi 3 giây
```

### Bước 2 — iPhone quét QR → landing page

```
User quét QR bằng camera iPhone
→ Safari mở /enroll/{token}   (app/enroll/[token]/page.tsx)
→ Hiển thị trang với nút "Tải hồ sơ"
→ User bấm nút → window.location.href = /api/device-enroll/{token}/profile
```

### Bước 3 — Server tạo và ký .mobileconfig

```
GET /api/device-enroll/{token}/profile
→ Đọc doc device_enrollments/{token} từ Firestore
→ Kiểm tra token tồn tại + chưa hết hạn
→ Tạo XML Apple Configuration Profile (PayloadType: "Profile Service")
   - URL: /api/device-enroll/{token}/complete
   - DeviceAttributes: [UDID, SERIAL, PRODUCT, IMEI]
→ signMobileconfig(xml):
   - Đọc PROFILE_SIGNING_CERT + PROFILE_SIGNING_KEY từ env
   - Thay \n literal → newline thật
   - forge.pkcs7.createSignedData()
   - Sign với RSA 2048 Let's Encrypt cert
   - Trả về DER-encoded Buffer
→ Response: Content-Type: application/x-apple-aspen-config
```

### Bước 4 — iOS nhận .mobileconfig và gửi UDID

```
iOS Safari nhận file .mobileconfig có PayloadType "Profile Service"
→ iOS hiển thị dialog xác nhận cài hồ sơ
→ User xác nhận (bỏ qua cảnh báo "chưa xác minh")
→ iOS tự động POST CMS-signed plist tới complete URL:
   POST /api/device-enroll/{token}/complete
   Body: CMS/PKCS#7 binary (chứa UDID, SERIAL, PRODUCT, IMEI)
```

### Bước 5 — Server xử lý UDID

```
POST /api/device-enroll/{token}/complete
→ Đọc request body dưới dạng Buffer
→ extractField(buf, "UDID") — tìm XML trong payload CMS
→ Cập nhật Firestore: device_enrollments/{token}
   { status: "registered", udid, deviceProduct, deviceSerial, registeredAt }
→ Auto-save vào users/{userId}/devices/{udid}
   { udid, name, deviceProduct, deviceSerial, source, addedAt }
→ Response 200 (iOS cần 200 để hoàn tất)
```

### Bước 6 — Dashboard phát hiện và lưu

```
Poll /api/device-enroll/{token}/status
→ data.status === "registered" → dừng poll
→ Modal chuyển sang step "naming"
→ Hiển thị UDID + input đặt tên thiết bị
→ User bấm "Lưu device"
   → POST /api/devices  (Bearer: Firebase ID Token)
   → Server lưu vào users/{uid}/devices/{udid} với tên user đặt
→ Modal đóng → gọi fetchDevices()
→ GET /api/devices  (Admin SDK — bypass Firestore rules)
→ Cập nhật danh sách
```

---

## 5. Sơ đồ luồng

```
Dashboard                iPhone (Safari)              Server
────────                 ───────────────              ──────
[Thêm device]
    │
    ├──POST /create ──────────────────────────────────► tạo enrollment doc
    │◄── { token } ──────────────────────────────────── Firestore: pending
    │
[Hiện QR /enroll/token]
    │
    │                  [Quét QR]
    │                      │
    │                  [/enroll/token]
    │                      │
    │                  [Tải hồ sơ]
    │                      │
    │                      ├──GET /profile ───────────► ký .mobileconfig
    │                      │◄── CMS signed ────────────
    │                      │
    │                  [Confirm install]
    │                      │
    │                      ├──POST /complete ─────────► extract UDID
    │                      │                            update: registered
    │                      │                            save: users/.../devices
    │◄──poll /status ──────────────────────────────────
    │   status=registered
    │
[Nhập tên]
    │
    ├──POST /api/devices ────────────────────────────► lưu tên
    │
[fetchDevices → list]
```

---

## 6. Cấu trúc dữ liệu Firestore

### `device_enrollments/{token}`

| Field | Type | Mô tả |
|---|---|---|
| `userId` | string | UID của user tạo enrollment |
| `source` | `"dashboard"` \| `"cli"` | Nguồn tạo |
| `status` | `"pending"` \| `"registered"` | Trạng thái |
| `expiresAt` | number | Unix timestamp hết hạn (10 phút) |
| `udid` | string \| null | UDID sau khi iOS submit |
| `deviceProduct` | string \| null | Model ID (VD: `iPhone17,1`) |
| `deviceSerial` | string \| null | Serial number |
| `createdAt` | number | Unix timestamp tạo |
| `registeredAt` | number \| null | Unix timestamp iOS submit |

### `users/{uid}/devices/{udid}`

| Field | Type | Mô tả |
|---|---|---|
| `udid` | string | UDID thiết bị |
| `name` | string | Tên do user đặt |
| `deviceProduct` | string \| null | Model ID |
| `deviceSerial` | string \| null | Serial number |
| `source` | `"dashboard"` \| `"cli"` | Nguồn thêm |
| `addedAt` | Timestamp | Firestore server timestamp |

---

## 7. Signing Certificate

Profile `.mobileconfig` phải được ký bằng CMS/PKCS#7 để iOS chấp nhận qua HTTPS.

> **Lưu ý**: Dùng self-signed cert thay vì CA cert (Let's Encrypt). UX hoàn toàn giống nhau (iOS vẫn hiển thị cảnh báo "Unverified"), nhưng không cần renewal phức tạp — cert có thời hạn 10 năm.

### Tạo certificate mới (khi cần renew)

```bash
# Tạo self-signed RSA 2048 cert, hạn 10 năm
openssl req -x509 -newkey rsa:2048 \
  -keyout /tmp/profile-signing.key \
  -out /tmp/profile-signing.crt \
  -days 3650 \
  -nodes \
  -subj "/CN=antgo.work/O=Ant Go/C=VN"

# Verify ngày hết hạn
openssl x509 -in /tmp/profile-signing.crt -noout -dates
```

### Lưu vào Secret Manager

```bash
node -e "
const fs = require('fs');
const cert = fs.readFileSync('/tmp/profile-signing.crt', 'utf8').replace(/\n/g, '\\\\n');
const key  = fs.readFileSync('/tmp/profile-signing.key', 'utf8').replace(/\n/g, '\\\\n');
fs.writeFileSync('/tmp/cert_value.txt', cert);
fs.writeFileSync('/tmp/key_value.txt',  key);
"

gcloud secrets versions add PROFILE_SIGNING_CERT --project=ant-go --data-file=/tmp/cert_value.txt
gcloud secrets versions add PROFILE_SIGNING_KEY  --project=ant-go --data-file=/tmp/key_value.txt
```

> **Lưu ý**: Dùng `\n` literal (escaped), không dùng newline thật. YAML single-quoted string không cho phép newline thật.

### Ngày hết hạn

Certificate hiện tại hết hạn **2036-04-29**. Không cần renewal trong ~10 năm.

---

## 8. Vấn đề kỹ thuật đã giải quyết

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| Trang trắng khi tải hồ sơ | node-forge không hỗ trợ EC key (PKCS#8) | Re-issue cert với `--key-type rsa` |
| "Safari không thể cài đặt cấu hình" | Profile không được ký bằng CA-trusted cert | Dùng Let's Encrypt qua certbot HTTP-01 |
| ACME challenge không cần redeploy | certbot cần serve file tĩnh | Route Firestore-backed `/.well-known/acme-challenge/[token]` |
| Device không xuất hiện sau lưu | Client Firestore `onSnapshot` bị chặn bởi security rules | Đổi sang `GET /api/devices` (Admin SDK) |
| Device không tự động lưu | `create` endpoint không lưu `userId` | Thêm auth vào `create`, lưu `userId` vào enrollment doc |
| `Buffer` không gán được vào `NextResponse` | TypeScript `BodyInit` không nhận `Buffer` | Wrap bằng `new Uint8Array(body)` |
| ACME challenge sai format | Hook lưu `token.validation` thay vì chỉ `validation` | `CERTBOT_VALIDATION` đã là full key authorization |

---

## 9. Hạn chế hiện tại

- **Cảnh báo "chưa xác minh"**: iOS yêu cầu cert S/MIME hoặc Apple-issued để ký profile không có cảnh báo. Self-signed cert (cũng như Let's Encrypt) đều hiển thị cảnh báo "Unverified". Người dùng cần bấm qua cảnh báo để hoàn tất. UDID vẫn được capture thành công.
