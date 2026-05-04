# Build Flow — CLI đến Dashboard

Luồng đầy đủ từ khi CLI gửi lệnh `ant build` đến khi artifact (.ipa/.apk) sẵn sàng trên dashboard.

---

## Tổng quan

```
CLI                         Dashboard (Next.js)             Mac Build Server
 │                                  │                               │
 ├── 1. Đọc app.json / ant.json     │                               │
 ├── 2. Apple credentials (iOS)     │                               │
 ├── 3. POST /api/builds ──────────►│ tạo job Firestore             │
 │        ◄── { jobId, tarUrl, credsUrl }                           │
 ├── 4. Upload tar.gz ─────────────────────────────► GCS signed URL │
 ├── 5. Upload credentials.json ───────────────────► GCS signed URL │
 ├── 6. POST /api/builds/:id/start ►│ xác minh files → status=pending
 │                                  │                               │
 │                                  │◄── poll Firestore builds/{id} ┤
 │                                  │    status: pending            │
 │                                  │    → in_progress ─────────────┤
 │                                  │    → success/failed           │
 │                                  │                               │
 └── hiện URL, thoát                │                               │
                                    │◄── ipaUrl, buildLogUrl ───────┘
                                    │    (ghi vào Firestore)
```

---

## Các files liên quan

| File | Vai trò |
|---|---|
| `cli/src/commands/build.js` | Entry point lệnh `ant build` |
| `cli/src/apple-creds.js` | Thu thập Apple credentials (cert + provisioning profile) |
| `cli/src/api.js` | Axios client gọi API |
| `app/api/builds/route.ts` | `POST /api/builds` — tạo job + sinh signed URL |
| `lib/build.service.ts` | Logic `prepareBuild()` + `startBuild()` |
| `app/api/builds/[id]/start/route.ts` | `POST /api/builds/:id/start` — verify files, đánh dấu pending |
| `app/api/builds/[id]/route.ts` | `GET /api/builds/:id` — đọc trạng thái; `DELETE` — xoá job |
| `app/api/builds/[id]/log/route.ts` | `GET /api/builds/:id/log` — proxy log file từ GCS |
| `app/api/builds/[id]/mark-failed/route.ts` | Force set `status=failed` |
| `app/api/builds/[id]/rebuild/route.ts` | Reset job về `pending` để build lại |
| `app/account/app/[appName]/builds/[buildId]/page.tsx` | UI trang chi tiết build |

---

## Flow chi tiết

### Bước 1 — CLI đọc cấu hình

CLI đọc 2 file:

**`app.json`** — lấy project info:
```
expo.extra.ant.projectId    ← ID project trên antgo.work
expo.extra.ant.bundleId     ← Bundle ID (com.example.app)
expo.extra.ant.schemeName   ← Xcode scheme name
expo.extra.ant.xcworkspace  ← tên file .xcworkspace
```

**`ant.json`** — lấy build profile:
```json
{
  "build": {
    "production":  { "distribution": "store" },
    "development": { "distribution": "internal", "developmentClient": true },
    "preview":     { "distribution": "internal" }
  }
}
```
Nếu `ant.json` chưa tồn tại, CLI tự tạo với 3 profile mặc định trên.

---

### Bước 2 — Thu thập Apple credentials (iOS only)

CLI gọi `ensureAppleCreds()` trong `apple-creds.js`:

1. **Kiểm tra cache** tại `~/.ant-go/creds-{profileName}.json` (TTL 24h) — nếu còn hợp lệ, hỏi user có muốn dùng lại không.
2. **Nếu không có cache** → hỏi Apple ID + App-Specific Password qua prompt.
3. **Login Apple** qua `@expo/apple-utils` `Auth.loginAsync()` — hỗ trợ 2FA.
4. **Chọn Team** nếu account có nhiều team.
5. **UDID enrollment** (chỉ `distribution: internal`) → qua QR code / `.mobileconfig` (xem [device-enrollment-flow.md](./device-enrollment-flow.md)) → đăng ký UDID lên Apple Developer Portal.
6. **Distribution/Development Certificate** → reuse nếu có, tạo mới nếu chưa có → export `.p12`.
7. **Provisioning Profile** → reuse nếu còn ACTIVE và khớp cert, tạo lại nếu không.
8. **Lưu cache** kết quả vào `~/.ant-go/creds-{profileName}.json`.

Kết quả trả về:
```json
{
  "p12Base64": "...",
  "p12Password": "...",
  "mobileprovisionBase64": "...",
  "teamId": "TEAMID",
  "appleId": "dev@example.com",
  "bundleId": "com.example.app",
  "schemeName": "MyApp",
  "xcworkspace": "MyApp.xcworkspace",
  "xcodeproj": "MyApp.xcodeproj",
  "distribution": "store"
}
```

---

### Bước 3 — Tạo build job

CLI gọi:
```
POST /api/builds
Authorization: Bearer <cliToken>
Body: { projectId, platform, autoSubmit }
```

**Server `POST /api/builds`:**
1. Xác thực CLI token qua `validateCliToken()` (Firestore `cli_tokens/{token}`).
2. Gọi `prepareBuild(projectId, platform, { autoSubmit })` trong `build.service.ts`:
   - Kiểm tra `projectId` tồn tại trong Firestore collection `apps`.
   - Tạo `jobId = Date.now().toString()`.
   - Tạo document trong Firestore `builds/{jobId}`:
     ```
     status:    "uploading"
     step:      "uploading"
     projectId, platform, userId, appName
     autoSubmit: true/false
     basePath:  "builds/{jobId}"
     createdAt, updatedAt
     ```
   - Tạo 2 **GCS Signed URL** (write, hết hạn sau 30 phút):
     - `builds/{jobId}/ios.tar.gz` (hoặc `android.tar.gz`)
     - `builds/{jobId}/credentials.json`
3. Trả về: `{ jobId, tarUrl, credsUrl }`

---

### Bước 4 — Nén và upload project

CLI nén project thành `ios.tar.gz` (hoặc `android.tar.gz`), loại trừ:
- iOS: `ios/Pods`, `ios/build`, `ios/fastlane`, `node_modules/.cache`, `.git`, `.expo`
- Android: `android/build`, `android/.gradle`, `node_modules/.cache`, `.git`, `.expo`

Upload thẳng lên GCS qua signed URL bằng HTTP PUT (stream pipe, hiển thị % tiến trình).

---

### Bước 5 — Upload credentials.json (iOS only)

CLI tạo file `credentials.json` trong thư mục tạm:
```json
{
  "p12Base64": "...",
  "p12Password": "...",
  "mobileprovisionBase64": "...",
  "bundleId": "com.example.app",
  "teamId": "TEAMID123",
  "schemeName": "MyApp",
  "xcworkspace": "MyApp.xcworkspace",
  "xcodeproj": "MyApp.xcodeproj",
  "distribution": "store",
  "developmentClient": false
}
```

Upload lên GCS qua signed URL. Xoá thư mục tạm sau khi xong.

---

### Bước 6 — Kích hoạt build

CLI gọi:
```
POST /api/builds/{jobId}/start
```

**Server `POST /api/builds/:id/start`:**
Gọi `startBuild(id)` **async (không block response)**:
1. Kiểm tra cả 2 file đã tồn tại trên GCS.
2. Nếu đủ → cập nhật Firestore `builds/{jobId}`: `status = "pending"`, `step = "pending"`.
3. Nếu thiếu → cập nhật `status = "failed"`, ghi `errorMessage`.

CLI nhận response `{ ok: true }`, in URL theo dõi và **thoát ngay** — không poll thêm.

---

### Bước 7 — Mac build server xử lý

Mac build server (chạy ngoài Next.js) poll Firestore để tìm job có `status = "pending"`:

1. Nhận job → cập nhật `status = "in_progress"`, `step = "initialising"`.
2. Download `ios.tar.gz` + `credentials.json` từ GCS.
3. Giải nén, chạy build (Fastlane + Xcode). Trong quá trình build:
   - Ghi log theo từng bước vào Firestore subcollection `builds/{jobId}/logs/{seq}` (mỗi doc có `seq`, `step`, `lines[]`).
   - Cập nhật `step` theo tiến trình: `downloading` → `extracting` → `npm_install` → `setup_certs` → `bundle_install` → `fastlane_build` → `uploading_ipa`.
   - Cập nhật `lastHeartbeat` định kỳ để dashboard phát hiện nếu server crash.
4. **Kết thúc thành công:**
   - Upload IPA lên GCS.
   - Upload `build.log` lên GCS.
   - Cập nhật Firestore:
     ```
     status:      "success"
     step:        "done"
     ipaUrl:      "https://storage.googleapis.com/..."
     buildLogUrl: "https://storage.googleapis.com/.../build.log"
     manifestUrl: "..."   ← chỉ có khi distribution: internal
     completedAt: "..."
     ```
5. **Kết thúc thất bại:**
   - Cập nhật: `status = "failed"`, `step = "error"`, `errorMessage`.

---

### Bước 8 — Dashboard hiển thị realtime

Trang `/account/app/{appName}/builds/{buildId}` listen **Firestore `onSnapshot`** trên `builds/{jobId}`:

- **Khi `status = "pending"`**: hiện banner "Đang chờ Mac build server nhận job...".
- **Khi `status = "in_progress"`**: hiện badge LIVE, listen realtime subcollection `builds/{jobId}/logs` — log hiển thị ngay khi Mac server ghi vào. Bật **heartbeat check** mỗi 15 giây:
  - `lastHeartbeat` cách hiện tại > 2 phút → hiện cảnh báo "Build có thể bị treo".
  - > 5 phút → tự động gọi `POST /api/builds/:id/mark-failed`.
- **Khi `status = "success"` hoặc `"failed"`**: chuyển sang **historical mode** — fetch `build.log` từ GCS qua `GET /api/builds/:id/log` (proxy để tránh CORS). Retry tự động với backoff (2s → 4s → 8s → 15s) vì file có thể chưa upload xong.
- **Tab Install** (chỉ `distribution: internal` + `status: success`): hiện QR code dùng `itms-services://` để cài app thẳng lên iPhone.

---

## Firestore data model

```
builds/{jobId}
  projectId, platform, userId, appName
  status:       "uploading" | "pending" | "in_progress" | "success" | "failed"
  step:         "uploading" | "pending" | "initialising" | "downloading" | "extracting"
                "npm_install" | "setup_certs" | "bundle_install" | "fastlane_build"
                "uploading_ipa" | "done" | "error"
  autoSubmit:   bool
  basePath:     "builds/{jobId}"
  ipaUrl:       string | null
  dsymUrl:      string | null
  buildLogUrl:  string | null
  manifestUrl:  string | null      ← internal distribution only
  errorMessage: string | null
  lastHeartbeat: timestamp          ← cập nhật bởi Mac server khi in_progress
  createdAt, updatedAt, startedAt, completedAt

builds/{jobId}/logs/{seq}
  seq:   number   ← thứ tự log, dùng để sort
  step:  string   ← bước hiện tại khi ghi log
  lines: string[] ← mảng các dòng text
```

---

## GCS Storage layout

```
builds/{jobId}/
  ios.tar.gz          ← upload bởi CLI
  credentials.json    ← upload bởi CLI (iOS only)
  build.log           ← upload bởi Mac server sau khi xong
  MyApp.ipa           ← upload bởi Mac server sau khi xong
```

---

## Trạng thái build

| Status | Ý nghĩa |
|---|---|
| `uploading` | CLI đang upload files |
| `pending` | Files đủ, đang chờ Mac build server nhận |
| `in_progress` | Mac server đang build |
| `success` | Build hoàn tất, IPA sẵn sàng |
| `failed` | Build thất bại |

---

## Phát hiện server/build bị treo

Dashboard theo dõi 2 nguồn:

1. **`server_status/mac_builder`** — Mac server ghi heartbeat định kỳ. Nếu `lastHeartbeat` cách hiện tại > 90 giây → hiện badge "Server Offline".
2. **`builds/{jobId}.lastHeartbeat`** — Mac server cập nhật khi đang build. Nếu cách hiện tại > 2 phút → cảnh báo "Build có thể bị treo". Nếu > 5 phút → tự động gọi `mark-failed`.

---

## Rebuild

Khi build đã kết thúc (success hoặc failed), user có thể bấm **Rebuild**:
```
POST /api/builds/{jobId}/rebuild
```
Server reset lại job về `status = "pending"` và xoá `errorMessage` — Mac server sẽ tự pick up lại với cùng files đã upload trước đó trên GCS.
