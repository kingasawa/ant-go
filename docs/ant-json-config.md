# ant.json — Cấu hình build

File `ant.json` đặt ở thư mục gốc của project (cùng cấp với `app.json`). Nếu chưa có, CLI sẽ tự tạo với các profile mặc định khi bạn chạy `ant build` lần đầu.

---

## Cấu trúc tổng quát

```json
{
  "build": {
    "<tên-profile>": {
      "distribution": "store | internal",
      "developmentClient": true
    }
  }
}
```

Mỗi key trong `"build"` là tên một **build profile**. Dùng bằng flag `--profile`:

```bash
ant build --platform ios --profile production
ant build --platform ios --profile development
```

---

## Các field

### `distribution`

| Giá trị | Ý nghĩa |
|---|---|
| `"store"` | Build để upload lên App Store / TestFlight (Distribution cert + App Store profile) |
| `"internal"` | Build để cài trực tiếp lên device (Development cert + Ad Hoc profile). Cần đăng ký UDID trước. |

**Mặc định:** `"store"`

---

### `developmentClient`

| Giá trị | Ý nghĩa |
|---|---|
| `true` | Build development client (Expo Dev Client). Dùng cho môi trường development. |
| `false` | Build release bình thường |

**Mặc định:** `false`

---

## File mặc định (tự tạo khi chưa có)

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

---

## Build Number

**Build number** (`CFBundleVersion` trên iOS) được đọc từ `expo.ios.buildNumber` trong `app.json` — đồng bộ với cách EAS Build hoạt động.

| Tình huống | Cấu hình | Kết quả |
|---|---|---|
| **Không điền** | _(bỏ trống field)_ | Server tự động tăng từ lần build trước (auto-increment) |
| **Điền số cụ thể** | `"buildNumber": "42"` | Dùng đúng số 42 cho build này |

Ví dụ `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "buildNumber": "42"
    }
  }
}
```

> **Lưu ý:** Nếu bạn điền `buildNumber` thủ công, bạn phải tự tăng số trước mỗi lần build lên TestFlight. Nếu để trống, server quản lý và đảm bảo không bao giờ bị trùng.

### Luồng buildNumber

```
ant build --platform ios
    │
    ├── app.json có expo.ios.buildNumber?
    │     ├── Có (VD: "42") → dùng 42
    │     └── Không         → server đọc lastBuildNumber từ Firestore, tăng lên 1
    │
    └── buildNumber được lưu vào Firestore builds/{jobId}.buildNumber
        → hiện trên Dashboard (Builds page)
        → dùng khi Submit lên TestFlight
```

---

## Các field trong `app.json` dùng cho CLI

CLI đọc thêm thông tin từ `app.json` tại `expo.extra.ant`:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "buildNumber": "42"
    },
    "extra": {
      "ant": {
        "projectId": "abc123",
        "bundleId": "com.example.myapp",
        "schemeName": "MyApp",
        "xcworkspace": "MyApp.xcworkspace",
        "xcodeproj": "MyApp.xcodeproj"
      }
    }
  }
}
```
