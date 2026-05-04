# ant-go CLI

Build app iOS và Android nhanh chóng chỉ với một lệnh — không cần cấu hình CI/CD phức tạp.

## Cài đặt

```bash
npm install -g ant-go
```

## Bắt đầu

### 1. Đăng nhập

```bash
# Đăng nhập bằng email/password
ant auth login

# Hoặc đăng nhập qua Google bằng trình duyệt
ant auth login --browser
```

### 2. Thêm cấu hình vào `app.json`

```json
{
  "expo": {
    "extra": {
      "ant": {
        "projectId": "your-project-id",
        "bundleId": "com.example.myapp",
        "schemeName": "MyApp",
        "xcworkspace": "MyApp.xcworkspace"
      }
    }
  }
}
```

### 3. Build

```bash
ant build --platform ios
```

---

## Các lệnh

### `ant build`

Nén project, upload lên build server và theo dõi tiến trình.

```bash
ant build --platform ios
ant build --platform ios --profile development
ant build --platform ios --auto-submit        # tự submit lên TestFlight sau khi build xong
ant build --platform ios --reauth             # đăng nhập lại Apple Developer, bỏ cache
ant build --platform ios --refresh-profile    # tạo lại Provisioning Profile
```

| Option | Mô tả |
|---|---|
| `--platform <platform>` | `ios` hoặc `android` |
| `--profile <profile>` | Build profile trong `ant.json` (mặc định: `production`) |
| `--project <path>` | Đường dẫn tới project (mặc định: thư mục hiện tại) |
| `--reauth` | Bỏ cache Apple Developer session, đăng nhập lại từ đầu |
| `--refresh-profile` | Tạo lại Provisioning Profile (dùng khi thay đổi Capabilities) |
| `--auto-submit` | Tự động submit IPA lên TestFlight sau khi build xong |

---

### `ant status <jobId>`

Xem trạng thái của một build job.

```bash
ant status abc123xyz
```

```
  Job ID:   abc123xyz
  Status:   SUCCESS
  Created:  4/27/2026, 10:30:00 AM
  Updated:  4/27/2026, 10:45:12 AM
  IPA:      https://storage.googleapis.com/.../MyApp.ipa
```

---

### `ant auth login`

Đăng nhập vào tài khoản antgo.work. Token được lưu tại `~/.ant-go/config.json`.

```bash
ant auth login
ant auth login --browser   # Google OAuth
```

### `ant auth logout`

Đăng xuất và thu hồi token hiện tại.

```bash
ant auth logout
```

### `ant auth whoami`

Xem thông tin tài khoản đang đăng nhập.

```bash
ant auth whoami
```

```
  Name:    Nguyen Van A
  Email:   dev@example.com
  Plan:    Pro
  Credits: 12 / 15
  Expires: 2026-05-01 10:30:00
```

---

## Build Profiles (`ant.json`)

Đặt file `ant.json` ở thư mục gốc của project (cùng cấp với `app.json`). Nếu chưa có, CLI tự tạo khi chạy lần đầu.

```json
{
  "build": {
    "production": {
      "distribution": "store"
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    }
  }
}
```

| Profile | `distribution` | Dùng khi |
|---|---|---|
| `production` | `store` | Release lên App Store hoặc TestFlight |
| `development` | `internal` | Debug trên thiết bị thật, kết nối Metro bundler |
| `preview` | `internal` | Share bản test nội bộ trước khi lên store |

> **`distribution: internal`** yêu cầu đăng ký UDID thiết bị trước. CLI sẽ hướng dẫn qua QR code tự động.

---

## Add Device (iOS internal build)

Khi build với `distribution: internal`, CLI tự động hỏi bạn muốn build cho thiết bị nào. Nếu chưa đăng ký thiết bị hoặc muốn thêm mới:

1. CLI hiển thị **QR code** trong terminal.
2. Quét QR bằng **Camera app** trên iPhone (không cần app riêng).
3. iPhone tải `.mobileconfig` → gửi UDID về server tự động.
4. CLI nhận UDID, đăng ký lên **Apple Developer Portal** và tạo Provisioning Profile mới.

```bash
ant build --platform ios --profile development
```

---

## Auto Submit lên TestFlight

Thêm `--auto-submit` để CLI tự động gửi IPA lên TestFlight ngay sau khi build xong (chỉ dùng với `distribution: store`).

```bash
ant build --platform ios --auto-submit
```

CLI sẽ tự động:
1. Tạo và cache **App Store Connect API Key** từ Apple Developer Portal session.
2. Upload key lên server (dùng cho bước submit).
3. Sau khi build xong, server tự trigger submit job lên TestFlight.

---

## Luồng hoạt động

```
ant build --platform ios
    │
    ├── Đọc app.json + ant.json
    ├── Đăng nhập Apple Developer (cache 24h)
    ├── Tạo/reuse Distribution Certificate (.p12)
    ├── Tạo/reuse Provisioning Profile
    ├── POST /api/builds → nhận jobId + signed upload URLs
    ├── Upload project.tar.gz → GCS
    ├── Upload credentials.json → GCS
    ├── POST /api/builds/:id/start
    │
    └── Build URL: https://antgo.work/account/app/MyApp/builds/abc123xyz

Mac Build Server (tự động):
    ├── Download + giải nén project
    ├── npm install + Fastlane + Xcode build
    ├── Upload IPA → GCS
    └── Cập nhật trạng thái + trừ credit → dashboard realtime
```

---

## Cache credentials

CLI cache Apple credentials tại `~/.ant-go/creds-<profileName>.json` (TTL 24h):

- Apple Developer session
- Distribution Certificate (`.p12`)
- Provisioning Profile
- App Store Connect API Key (không hết hạn)

Dùng `--reauth` để xoá cache và đăng nhập lại từ đầu.

---

## Tài liệu đầy đủ

👉 **[antgo.work/docs](https://antgo.work/docs)**
