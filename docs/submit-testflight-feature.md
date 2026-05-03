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

### `users/{uid}/asc_credentials/default`

```
users/
  {uid}/
    asc_credentials/
      default/
        encryptedKey:   string     // Nội dung .p8 đã mã hoá AES-256-GCM
        keyId:          string | null
        issuerId:       string | null
        updatedAt:      Timestamp
```

Lưu **theo user** (không theo app). Một user có 1 bộ credentials dùng cho tất cả apps.

`encryptedKey` theo format: `iv_hex:authTag_hex:ciphertext_hex`.
`ASC_ENCRYPTION_KEY` (32 byte hex) được lưu trong Google Secret Manager.

---

## API Endpoints

### `GET /api/user/asc-credentials`
Trả `{ hasKey, keyId?, issuerId? }`. Không bao giờ trả private key.  
**Auth**: Firebase ID Token hoặc CLI token.

### `POST /api/user/asc-credentials`
Body: `{ privateKeyP8?, keyId?, issuerId? }` — partial update, merge.  
**Auth**: Firebase ID Token hoặc CLI token.

### `DELETE /api/user/asc-credentials`
Xoá toàn bộ ASC credentials của user.

### `GET /api/apps/{appName}/app-store-key` / `POST` / `DELETE`
Backward-compat — proxy sang `asc_credentials`. Hoạt động như trước.

### `GET /api/apps/{appName}/submissions`
Trả danh sách 20 submissions gần nhất của user cho app đó, sắp xếp theo `createdAt` desc.

### `POST /api/apps/{appName}/submissions`
Body: `{ buildId }`.

Validation:
- Build phải có `status === "success"` và `ipaUrl` tồn tại
- User phải có ASC credentials đủ (hasKey + keyId + issuerId) → nếu không trả `422 { error: "missing_asc_key" }`

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
   - Đọc `users/{uid}/asc_credentials/default` (per-user)
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

### Cách 1: Tự động qua CLI (khuyến nghị)

Sau khi `ant-go auth login` thành công, CLI hỏi setup ASC ngay:

```bash
ant-go auth login        # → hỏi setup ASC sau login
ant-go configure-asc     # → hoặc setup riêng lẻ bất kỳ lúc nào
```

CLI tự động: đăng nhập Apple Developer → tạo key mới → download .p8 → lưu server theo user.

### Cách 2: Thủ công qua Settings trên Dashboard

**Settings → Apple Developer** → nhập Key ID và Issuer ID.  
(Private key phải có qua CLI — không paste trên dashboard.)

Lấy tại [App Store Connect → Users and Access → Integrations](https://appstoreconnect.apple.com/access/integrations/api):
1. Nhấn **Generate API Key** → role **Admin** / **App Manager**
2. Lưu **Key ID** và **Issuer ID** (UUID đầu trang)
3. Download **AuthKey_XXXXXX.p8** (chỉ 1 lần)

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
