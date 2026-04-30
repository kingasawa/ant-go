# Device Enrollment Flow

Luồng đăng ký UDID thiết bị iOS từ ant-go dashboard.

## Tổng quan

Khi user bấm **"Thêm device"** trên trang `/account/devices`, hệ thống dùng cơ chế **Apple Profile Service** (`.mobileconfig`) để iOS tự động gửi UDID về server — không cần app riêng, chỉ cần Camera app quét QR.

> Device được lưu vào Firestore của ant-go. Việc đăng ký UDID lên Apple Developer Portal xảy ra sau đó, khi chạy `ant-go build --profile development` từ CLI.

---

## Các files liên quan

| File | Vai trò |
|---|---|
| `app/(account)/account/devices/page.tsx` | UI: modal QR, polling, form đặt tên |
| `app/api/device-enroll/create/route.ts` | Tạo enrollment session trong Firestore |
| `app/api/device-enroll/[token]/profile/route.ts` | Trả về file `.mobileconfig` cho iPhone |
| `app/api/device-enroll/[token]/complete/route.ts` | Nhận UDID từ iOS sau khi cài profile |
| `app/api/device-enroll/[token]/status/route.ts` | Dashboard poll để biết khi nào iOS xác nhận |
| `app/api/devices/route.ts` | Lưu/đọc/xoá device vào `users/{uid}/devices` |

---

## Flow chi tiết

### Bước 1 — Tạo enrollment session

Dashboard gọi:
```
POST /api/device-enroll/create
Body: { source: "dashboard", origin: window.location.origin }
```

Server tạo document trong Firestore:
```
device_enrollments/{uuid}
  status:    "pending"
  source:    "dashboard"
  projectId: null
  createdAt: <timestamp>
  expiresAt: <+10 phút>
  udid:      null
```

Server trả về:
```json
{ "token": "uuid", "enrollUrl": "https://antgo.work/api/device-enroll/{token}/profile" }
```

**Ưu tiên base URL:** `NEXT_PUBLIC_APP_URL` → `body.origin` → host từ `request.url`

---

### Bước 2 — Hiển thị QR code

Dashboard dùng thư viện `qrcode` để render `enrollUrl` thành ảnh QR và hiển thị lên màn hình. Đồng thời bắt đầu poll `GET /api/device-enroll/{token}/status` mỗi **3 giây**.

---

### Bước 3 — iPhone quét QR → tải `.mobileconfig`

iPhone mở Safari từ Camera app, truy cập `enrollUrl`.

Server xác minh token còn hạn rồi trả về file `.mobileconfig`:

```
Content-Type: application/x-apple-aspen-config
```

Nội dung là một **Profile Service** plist — loại profile đặc biệt iOS dùng để thu thập thông tin thiết bị:

```xml
<key>PayloadType</key>
<string>Profile Service</string>

<key>URL</key>
<string>https://antgo.work/api/device-enroll/{token}/complete</string>

<key>DeviceAttributes</key>
<array>
  <string>UDID</string>
  <string>SERIAL</string>
  <string>PRODUCT</string>
  <string>IMEI</string>
</array>
```

---

### Bước 4 — iOS gửi UDID về server

iOS hiển thị hộp thoại **"Cài đặt Profile"**. Sau khi user cho phép, iOS **tự động POST** một CMS/PKCS7-signed plist về `completeUrl` chứa:

- `UDID` — định danh duy nhất của thiết bị
- `SERIAL` — số serial
- `PRODUCT` — model identifier (vd: `iPhone17,1`)
- `IMEI`

---

### Bước 5 — Server extract và lưu UDID

`POST /api/device-enroll/{token}/complete` nhận binary CMS body, dùng regex tìm embedded plist XML để extract các fields:

```
device_enrollments/{token}  →  cập nhật:
  status:        "registered"
  udid:          "00008110-001234ABCDEF"
  deviceProduct: "iPhone17,1"
  deviceSerial:  "XXXXX"
  registeredAt:  <timestamp>
```

Trả về HTTP 200 để iOS biết enrollment hoàn tất.

---

### Bước 6 — Dashboard nhận kết quả

Poll phát hiện `status === "registered"` → dừng polling → hiển thị form cho user đặt tên thiết bị. Sau khi bấm **Lưu**:

```
POST /api/devices
Authorization: Bearer <Firebase ID token>
Body: { udid, name, deviceProduct, deviceSerial, source: "dashboard" }
```

Device được lưu vào Firestore:

```
users/{uid}/devices/{udid}
  name:          "My iPhone"
  deviceProduct: "iPhone17,1"
  deviceSerial:  "XXXXX"
  source:        "dashboard"
  addedAt:       <server timestamp>
```

---

### Bước 7 — UI cập nhật realtime

Trang devices đang listen `onSnapshot` trên collection `users/{uid}/devices` → tự động hiển thị device mới không cần reload.

---

## Firestore collections

```
device_enrollments/{token}     ← session tạm thời (10 phút)
users/{uid}/devices/{udid}     ← danh sách device của user
```

---

## Quan hệ với Apple Developer Portal

Device sau khi lưu vào Firestore **chưa được đăng ký trên Apple Developer Portal**. Việc đăng ký UDID lên Apple xảy ra khi chạy CLI:

```bash
ant-go build --platform ios --profile development
```

Lúc đó CLI dùng `@expo/apple-utils` → `Device.createAsync()` để đăng ký UDID và thêm vào Provisioning Profile.
