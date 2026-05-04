# Submit IPA lên TestFlight — Tài liệu kỹ thuật

## Tổng quan

Tính năng cho phép user submit IPA đã build lên TestFlight trực tiếp từ dashboard mà không cần Xcode hay Transporter. Lịch sử submit được lưu vào Firestore và hiển thị real-time tại trang Submission.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Dashboard | Next.js 14 (App Router), React, Tailwind CSS |
| API | Next.js Route Handlers (`app/api/`) |
| Auth | Firebase Authentication (ID Token) |
| Database | Firestore (Admin SDK) |
| Key storage | Firestore + AES-256-GCM encryption |
| Build pipeline | Google Cloud Build (inline build) |
| IPA upload | Fastlane `upload_to_testflight` |
| Apple API | App Store Connect API v1 (JWT auth) |
| Secrets | Google Secret Manager |

---

## Quy trình hoạt động (End-to-End)

```
User (Dashboard)                     Next.js API                    Cloud Build              Apple
────────────────                     ──────────                     ───────────              ─────
1. Bấm "Submit to TestFlight"
   (trên build có IPA)
        │
        ▼
2. POST /api/apps/{app}/submissions
   { buildId }
        │
        ▼
        ├── 422 missing_asc_key ──► Mở AppStoreKeyModal
        │       │
        │       ▼
        │   POST /api/apps/{app}/app-store-key
        │   { keyId, issuerId, privateKeyP8 }
        │       │
        │       ▼ (key được encrypt AES-256-GCM rồi lưu Firestore)
        │   Retry POST /submissions
        │
        ▼ (200 OK)
3. { submissionId }
   Redirect → /submission page
        │
        │              ▼
        │    Tạo submissions/{id} { status: "pending" }
        │    Trigger Cloud Build inline job:
        │        │
        │        ├── [curl] Download IPA từ Firebase Storage
        │        ├── [node] fetch-asc-key.js → giải mã key, ghi asc_key.json
        │        │         Update status → "uploading"
        │        ├── [ruby] fastlane upload_to_testflight ──────────────────► App Store Connect
        │        └── [node] update-submission-status.js → status "done"
        │
4. Submission page poll API mỗi 5s
   (khi status là pending/uploading/processing)
        │
        ▼
5. Badge chuyển: pending → uploading → processing → done/failed
```

---

## Cấu trúc file

```
app/
  api/
    apps/[appName]/
      app-store-key/
        route.ts              ← GET/POST/DELETE key ASC
      submissions/
        route.ts              ← GET list + POST create
        [submissionId]/
          route.ts            ← GET single submission
  account/app/[appName]/
    submission/
      page.tsx                ← Danh sách submissions với status badge
    builds/
      page.tsx                ← Nút "Submit to TestFlight" trên mỗi build row
  components/
    AppStoreKeyModal.tsx      ← Modal nhập Key ID + Issuer ID + .p8

lib/
  asc-crypto.ts               ← AES-256-GCM encrypt/decrypt cho ASC private key

scripts/
  fetch-asc-key.js            ← Cloud Build: đọc Firestore, giải mã key, ghi JSON
  update-submission-status.js ← Cloud Build: cập nhật trạng thái submission

cloudbuild.submit.yaml        ← Reference YAML cho submission job (dùng inline)
```

---

## Firestore Schema

### `submissions/{submissionId}`

```
submissions/
  {auto-id}/
    appName:          string          // Tên app
    buildId:          string          // ID của build
    ipaUrl:           string          // URL download IPA (Firebase Storage signed URL)
    userId:           string          // UID của user
    bundleId:         string          // Bundle ID
    version:          string | null   // Version string (VD: "1.0.0")
    buildNumber:      number | null   // Build number (auto-increment từ pipeline)
    status:           "pending" | "uploading" | "processing" | "done" | "failed"
    errorMessage:     string | null
    testflightBuildId: string | null  // Build ID trên Apple sau khi upload xong
    createdAt:        Timestamp
    completedAt:      Timestamp | null
```

### `users/{uid}/asc_keys/{teamId}` ← per Apple Developer Team (CLI tự động upload)

```
users/
  {uid}/
    asc_keys/
      {teamId}/              // Apple Developer Team ID (VD: "A1B2C3D4E5")
        keyId:      string   // Key ID (VD: "2X9R4HXF34")
        issuerId:   string   // Issuer ID (UUID format)
        encryptedKey: string // Nội dung .p8 đã mã hoá AES-256-GCM
        updatedAt:  Timestamp
```

Key này được CLI tự động tạo và upload trong lúc `ant-go build` với `distribution: store`.
Vì key có `allAppsVisible: true` nên dùng được cho mọi app trong cùng Apple Developer Team.

### `users/{uid}/app_store_keys/{appName}` ← per app (dashboard manual, backward compat)

```
users/
  {uid}/
    app_store_keys/
      {appName}/
        keyId:        string   // Key ID (VD: "2X9R4HXF34")
        issuerId:     string   // Issuer ID (UUID format)
        encryptedKey: string   // Nội dung .p8 đã mã hoá AES-256-GCM
        updatedAt:    Timestamp
```

Key này do user nhập thủ công qua **AppStoreKeyModal** trên dashboard.
Được giữ lại để backward compat với user đã setup trước khi có CLI auto-collect.

`encryptedKey` được lưu theo format: `iv_hex:authTag_hex:ciphertext_hex`.  
`ASC_ENCRYPTION_KEY` (32 byte hex) được lưu trong Google Secret Manager và inject vào App Engine qua `env.yaml`.

---

## API Endpoints

### `GET /api/apps/{appName}/app-store-key`
Trả `{ hasKey: boolean, keyId?: string, issuerId?: string }`. Không bao giờ trả private key.

### `POST /api/apps/{appName}/app-store-key`
Body: `{ keyId, issuerId, privateKeyP8 }`.  
Mã hoá key rồi lưu vào Firestore. Trả `{ ok: true }`.

### `DELETE /api/apps/{appName}/app-store-key`
Xoá key. Trả `{ ok: true }`.

### `GET /api/apps/{appName}/submissions`
Trả danh sách 20 submissions gần nhất của user cho app đó, sắp xếp theo `createdAt` desc.

### `POST /api/apps/{appName}/submissions`
Body: `{ buildId }`.

Validation:
- Build phải có `status === "success"` và `ipaUrl` tồn tại
- Phải có App Store Connect key → nếu không trả `422 { error: "missing_asc_key" }`

Nếu hợp lệ: tạo submission doc → trigger Cloud Build → trả `{ submissionId }`.

### `GET /api/apps/{appName}/submissions/{submissionId}`
Trả chi tiết 1 submission. Validate ownership qua `userId`.

---

## Cloud Build Job

Job chạy inline (không dùng pre-configured trigger), được tạo trực tiếp qua `@google-cloud/cloudbuild` npm package.

**Các bước:**

1. **curl** — download IPA từ Firebase Storage signed URL vào `/workspace/app.ipa`
2. **node:20-slim** — chạy `scripts/fetch-asc-key.js`:
   - Kết nối Firestore qua Firebase Admin SDK
   - Tìm key theo thứ tự ưu tiên:
     1. `users/{uid}/asc_keys/{teamId}` — CLI tự động upload (per Apple Developer Team)
     2. `users/{uid}/app_store_keys/{appName}` — dashboard manual setup (backward compat)
   - Giải mã AES-256-GCM, ghi ra `/workspace/asc_key.json` (Fastlane format)
   - Cập nhật `submissions/{id}.status` → `"uploading"`
3. **ruby:3.2-slim** — chạy Fastlane:
   ```
   fastlane run upload_to_testflight
     ipa:/workspace/app.ipa
     api_key_path:/workspace/asc_key.json
     skip_waiting_for_build_processing:true
   ```
4. **node:20-slim** — chạy `scripts/update-submission-status.js`:
   - Cập nhật `submissions/{id}.status` → `"done"`
   - Set `completedAt`

Nếu bước 3 hoặc 4 thất bại, Cloud Build không tự update status → cần xử lý `onFailure` hoặc có cron job dọn dẹp.

**Secrets dùng trong job:**
- `FIREBASE_ADMIN_CREDENTIALS_JSON` — Service account credentials
- `ASC_ENCRYPTION_KEY` — Key giải mã private key của user

---

## App Store Connect API Key

> **Với CLI `ant-go build` (`distribution: store`):** Key được tạo và upload tự động trong lúc build — user **không cần setup thủ công** ở bước dưới. Xem [`docs/apple-utils-asc-key.md`](./apple-utils-asc-key.md).

Nếu cần setup thủ công (user không dùng CLI, hoặc muốn override key), tạo key tại [App Store Connect → Users and Access → Integrations](https://appstoreconnect.apple.com/access/integrations/api):

1. Nhấn **Generate API Key**
2. Chọn role **Admin** hoặc **App Manager**
3. Lưu lại **Key ID** và **Issuer ID**
4. Download file **AuthKey_XXXXXX.p8** (chỉ download được 1 lần)
5. Paste nội dung file vào modal "App Store Connect API Key" trên dashboard

Fastlane JSON format (được tạo bởi `fetch-asc-key.js`):
```json
{
  "key_id": "2X9R4HXF34",
  "issuer_id": "69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "key": "-----BEGIN PRIVATE KEY-----\nMIGH...\n-----END PRIVATE KEY-----",
  "in_house": false
}
```

---

## Trạng thái Submission

| Status | Màu | Ý nghĩa |
|---|---|---|
| `pending` | Vàng | Job đã được tạo, đang chờ Cloud Build khởi động |
| `uploading` | Xanh dương (pulse) | IPA đã download, đang upload lên Apple |
| `processing` | Xanh dương (pulse) | Apple đang xử lý build (5–15 phút) |
| `done` | Xanh lá | Upload thành công, build xuất hiện trên TestFlight |
| `failed` | Đỏ | Lỗi (xem `errorMessage`) |

Dashboard tự động poll API mỗi **5 giây** khi có submission đang ở trạng thái `pending`, `uploading`, hoặc `processing`.

---

## Bảo mật

- `privateKeyP8` được mã hoá AES-256-GCM trước khi lưu Firestore — không bao giờ lưu plain text
- API endpoint không bao giờ trả `privateKeyP8` về client
- Cloud Build scripts chạy với Service Account riêng (không phải App Engine service account)
- `ASC_ENCRYPTION_KEY` chỉ tồn tại trong Secret Manager và runtime environment — không commit vào code

---

## Lưu ý triển khai

- Sau khi upload xong, Apple cần 5–15 phút để xử lý build. Trong thời gian đó trạng thái sẽ là `processing`.
- Nếu Cloud Build job thất bại ở bước Fastlane, `update-submission-status.js` có thể không chạy → submission sẽ mắc kẹt ở `uploading`. Cần monitor và xử lý thủ công hoặc implement `onFailure` handler.
- `skip_waiting_for_build_processing: true` nghĩa là Fastlane không chờ Apple xử lý xong — job kết thúc ngay sau khi upload thành công.
