# ant.json — Cấu hình build

File `ant.json` đặt ở thư mục gốc của project (cùng cấp với `app.json`). Nếu chưa có, CLI sẽ tự tạo với các profile mặc định khi bạn chạy `ant-go build` lần đầu.

---

## Cấu trúc tổng quát

```json
{
  "build": {
    "<tên-profile>": {
      "distribution": "store | internal",
      "developmentClient": true,
      "buildNumber": 42
    }
  }
}
```

Mỗi key trong `"build"` là tên một **build profile**. Dùng bằng flag `--profile`:

```bash
ant-go build --platform ios --profile production
ant-go build --platform ios --profile development
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

### `buildNumber`

Số build (tương đương `CFBundleVersion` trên iOS). Dùng để phân biệt các bản build khi upload lên TestFlight — mỗi bản phải có `buildNumber` **tăng dần**, không được trùng.

| Tình huống | Cấu hình | Kết quả |
|---|---|---|
| **Không điền** | _(bỏ trống field này)_ | Server tự động tăng từ lần build trước (auto-increment) |
| **Điền số cụ thể** | `"buildNumber": 42` | Dùng đúng số 42 cho build này |

**Mặc định:** tự động tăng (bắt đầu từ 1)

> **Lưu ý:** Nếu bạn điền `buildNumber` thủ công, bạn phải tự tăng số trước mỗi lần build lên TestFlight. Nếu để trống, server quản lý và đảm bảo không bao giờ bị trùng.

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

## Ví dụ nâng cao

```json
{
  "build": {
    "production": {
      "distribution": "store"
    },
    "production-fixed-build": {
      "distribution": "store",
      "buildNumber": 100
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "qa": {
      "distribution": "internal"
    }
  }
}
```

---

## Luồng buildNumber

```
ant-go build --platform ios --profile production
    │
    ├── ant.json có buildNumber?
    │     ├── Có (VD: 42) → dùng 42, cập nhật lastBuildNumber nếu 42 > lastBuildNumber
    │     └── Không        → server đọc lastBuildNumber từ Firestore, tăng lên 1, dùng số mới
    │
    └── buildNumber được lưu vào Firestore builds/{jobId}.buildNumber
        → hiện trên Dashboard (Builds page)
        → dùng khi Submit lên TestFlight
```

---

## Các field khác trong `app.json` (dùng cho CLI)

CLI cũng đọc thêm thông tin từ `app.json` tại `expo.extra.ant`:

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

> `buildNumber` trong `ant.json` **override** hoàn toàn `expo.ios.buildNumber` trong `app.json`. CLI chỉ đọc `buildNumber` từ `ant.json`.
