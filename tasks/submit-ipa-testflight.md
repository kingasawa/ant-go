# Task: Submit IPA lên TestFlight (App Store Connect)

**Status:** pending  
**Priority:** high  
**Created:** 2026-05-02  
**Branch:** feature/submit-ipa-testflight  
**PR:** —

---

## Mục tiêu

Cho phép user submit IPA đã build lên TestFlight trực tiếp từ dashboard, không cần dùng Xcode hay Transporter. Lịch sử submit được lưu vào Firestore và hiển thị tại trang Submission.

---

## Tổng quan kiến trúc

```
Dashboard                         Server                          Apple
─────────                         ──────                          ─────
[Submit build]
    │
    ├──POST /api/apps/[app]/submissions ──► tạo submission doc (pending)
    │◄── { submissionId }                   kích hoạt Cloud Build job
    │
    │                         [Cloud Build job]
    │                              │
    │                              ├── download IPA từ Firebase Storage
    │                              ├── fastlane upload_to_testflight ──────► App Store Connect
    │                              ├── update submission: processing/done/failed
    │
    │◄──poll /api/apps/[app]/submissions/[id]
    │   status: done / failed
    │
[Submission page cập nhật]
```

---

## Firestore Schema

### `submissions/{submissionId}`

| Field | Type | Mô tả |
|---|---|---|
| `appName` | string | Tên app (key trong Firestore) |
| `buildId` | string | ID của build đã tạo IPA |
| `ipaUrl` | string | URL download IPA trên Firebase Storage |
| `userId` | string | UID của user tạo submission |
| `bundleId` | string | Bundle ID của app |
| `version` | string | Version string đọc từ `app.json` (VD: `1.0.0`) |
| `buildNumber` | number | Build number — lấy từ `builds/{buildId}.buildNumber` (đã auto-increment hoặc do user config trong `ant.json`) |
| `status` | `pending` \| `uploading` \| `processing` \| `done` \| `failed` | Trạng thái |
| `errorMessage` | string \| null | Thông báo lỗi nếu thất bại |
| `testflightBuildId` | string \| null | Build ID trên Apple sau khi upload xong |
| `createdAt` | Timestamp | Thời điểm tạo |
| `completedAt` | Timestamp \| null | Thời điểm hoàn thành |

### `users/{uid}/app_store_keys/{appName}`

Lưu App Store Connect API key của từng app (cần để upload lên Apple):

| Field | Type | Mô tả |
|---|---|---|
| `keyId` | string | Key ID từ App Store Connect |
| `issuerId` | string | Issuer ID từ App Store Connect |
| `privateKeyP8` | string | Nội dung file `.p8` (base64 hoặc raw) |
| `updatedAt` | Timestamp | Lần cập nhật gần nhất |

---

## Tiến độ

- [ ] TASK-01 — API: `POST /api/apps/[appName]/submissions` — tạo submission & trigger job
- [ ] TASK-02 — API: `GET /api/apps/[appName]/submissions` — danh sách + `GET .../[id]` status
- [ ] TASK-03 — API: `POST /api/apps/[appName]/app-store-key` — lưu/đọc ASC API key
- [ ] TASK-04 — Cloud Build: tạo `cloudbuild.submit.yaml` chạy Fastlane upload
- [ ] TASK-05 — Dashboard: Submission page — danh sách + badge trạng thái
- [ ] TASK-06 — Dashboard: nút "Submit to TestFlight" trên Builds page
- [ ] TASK-07 — Dashboard: modal nhập App Store Connect API key
- [ ] TASK-08 — Docs: cập nhật tài liệu

---

## Chi tiết subtask

### TASK-01 — API: Tạo submission & trigger Cloud Build job

**File:** `app/api/apps/[appName]/submissions/route.ts` _(tạo mới)_  
**Auth:** Firebase ID Token

```
POST /api/apps/{appName}/submissions
Body: { buildId: string }
```

Logic:
1. Xác thực user qua ID token
2. Đọc `builds/{buildId}` → lấy `ipaUrl`, `buildNumber` (đã có sẵn từ build pipeline); `bundleId` và `version` đọc từ `apps/{appName}`
3. Kiểm tra build status phải là `success` và `ipaUrl` tồn tại
4. Kiểm tra `users/{uid}/app_store_keys/{appName}` có key chưa → nếu chưa trả 422 với `{ error: "missing_asc_key" }`
5. Tạo doc trong `submissions/{uuid}`:
   ```ts
   { appName, buildId, ipaUrl, userId, bundleId, version, buildNumber,
     status: "pending", errorMessage: null, testflightBuildId: null,
     createdAt: serverTimestamp(), completedAt: null }
   ```
6. Trigger Cloud Build job `cloudbuild.submit.yaml` với substitutions:
   ```
   _SUBMISSION_ID, _IPA_URL, _APP_NAME, _USER_ID
   ```
7. Trả về `{ submissionId }`

Response:
```json
{ "submissionId": "uuid" }
```

---

### TASK-02 — API: Đọc submission list và status

**File:** `app/api/apps/[appName]/submissions/route.ts` _(cùng file TASK-01)_  
**File:** `app/api/apps/[appName]/submissions/[submissionId]/route.ts` _(tạo mới)_

```
GET /api/apps/{appName}/submissions
→ Trả danh sách submissions của app, orderBy createdAt desc, limit 20

GET /api/apps/{appName}/submissions/{submissionId}
→ Trả chi tiết 1 submission (dùng để poll status)
```

---

### TASK-03 — API: Lưu & đọc App Store Connect API key

**File:** `app/api/apps/[appName]/app-store-key/route.ts` _(tạo mới)_

```
GET /api/apps/{appName}/app-store-key
→ Trả { hasKey: true/false, keyId?, issuerId? }
   (không bao giờ trả private key ra ngoài)

POST /api/apps/{appName}/app-store-key
Body: { keyId, issuerId, privateKeyP8 }
→ Lưu vào users/{uid}/app_store_keys/{appName}
→ Trả { ok: true }

DELETE /api/apps/{appName}/app-store-key
→ Xoá key
```

**Bảo mật:** `privateKeyP8` được mã hoá trước khi lưu Firestore bằng AES-256 với key từ Secret Manager, hoặc lưu thẳng vào Google Secret Manager với tên `ASC_KEY_{uid}_{appName}`.

---

### TASK-04 — Cloud Build: `cloudbuild.submit.yaml`

**File:** `cloudbuild.submit.yaml` _(tạo mới)_

```yaml
steps:
  - name: "gcr.io/cloud-builders/gsutil"
    args: ["cp", "${_IPA_URL}", "/workspace/app.ipa"]

  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        # Đọc ASC key từ Firestore (qua Admin SDK script)
        node scripts/fetch-asc-key.js ${_USER_ID} ${_APP_NAME} > /workspace/key.json

        # Tạo AuthKey_{keyId}.p8
        KEY_ID=$(cat /workspace/key.json | jq -r .keyId)
        ISSUER_ID=$(cat /workspace/key.json | jq -r .issuerId)
        cat /workspace/key.json | jq -r .privateKeyP8 > /workspace/AuthKey_${KEY_ID}.p8

        # Cập nhật status → uploading
        node scripts/update-submission-status.js ${_SUBMISSION_ID} uploading

        # Upload bằng Fastlane pilot
        bundle exec fastlane run upload_to_testflight \
          ipa:"/workspace/app.ipa" \
          api_key_path:"/workspace/key.json" \
          skip_waiting_for_build_processing:true

        # Cập nhật status → done
        node scripts/update-submission-status.js ${_SUBMISSION_ID} done
```

**Scripts cần tạo:**
- `scripts/fetch-asc-key.js` — đọc ASC key từ Firestore/Secret Manager
- `scripts/update-submission-status.js` — cập nhật `submissions/{id}` trên Firestore

---

### TASK-05 — Dashboard: Submission page

**File:** `app/account/app/[appName]/submission/page.tsx` _(viết lại từ empty state)_

UI bao gồm:
- Header: "Submission" + badge tổng số
- Danh sách submissions, mỗi row hiển thị:
  - Version + Build number (VD: `1.0.0 (42)`)
  - Status badge: `pending` / `uploading` / `processing` / `done` / `failed`
  - Thời gian tạo
  - Link "Xem build" → `/account/app/{appName}/builds/{buildId}`
  - Error message nếu `failed`
- Polling tự động mỗi 5 giây khi có submission `pending` / `uploading` / `processing`
- Empty state khi chưa có submission nào

Status badge color:
```
pending    → yellow
uploading  → blue (animate-pulse)
processing → blue (animate-pulse)
done       → green
failed     → red
```

---

### TASK-06 — Dashboard: Nút "Submit to TestFlight" trên Builds page

**File:** `app/account/app/[appName]/builds/page.tsx` _(sửa)_

Thêm nút "Submit" vào mỗi build card có `status === "success"` và `ipaUrl` tồn tại:

```tsx
{build.status === "success" && build.ipaUrl && (
  <button onClick={() => handleSubmit(build.id)}>
    Submit to TestFlight
  </button>
)}
```

`handleSubmit(buildId)`:
1. Gọi `POST /api/apps/{appName}/submissions` với `{ buildId }`
2. Nếu response `422 missing_asc_key` → mở modal nhập ASC key (TASK-07)
3. Nếu thành công → redirect tới trang Submission
4. Hiện toast thông báo đang xử lý

---

### TASK-07 — Dashboard: Modal nhập App Store Connect API key

**File:** `app/account/app/[appName]/builds/page.tsx` hoặc component riêng _(tạo mới)_

Modal `AppStoreKeyModal` hiển thị khi user chưa có ASC key:

Fields:
- **Key ID** (VD: `2X9R4HXF34`)
- **Issuer ID** (VD: `69a6de70-...`)
- **Private Key (.p8)** — textarea paste nội dung file

Hướng dẫn link: "Cách lấy API key từ App Store Connect →"

Sau khi save:
1. `POST /api/apps/{appName}/app-store-key`
2. Tự động retry submit lại build đang chờ

---

### TASK-08 — Cập nhật tài liệu

**File:** `docs/submit-testflight-feature.md` _(tạo mới)_

Tài liệu tương tự `add-device-feature.md`, bao gồm:
- Quy trình hoạt động end-to-end
- Schema Firestore
- Cloud Build job config
- Cách lấy App Store Connect API key
- Trạng thái submission + ý nghĩa

---

## Thứ tự triển khai

```
TASK-03 (ASC key storage)
    │
    ├── TASK-01 (POST /submissions)
    │       │
    │       └── TASK-04 (Cloud Build job)
    │
    ├── TASK-02 (GET /submissions)
    │
    └── TASK-07 (Modal nhập key)
            │
            ├── TASK-05 (Submission page)
            └── TASK-06 (Nút Submit trên Builds)
                        │
                        └── TASK-08 (Docs)
```

TASK-01 và TASK-02 có thể làm song song.  
TASK-05, TASK-06, TASK-07 là frontend — có thể làm song song sau khi API xong.  
TASK-04 cần TASK-01 để biết substitution variables.

---

## Ghi chú kỹ thuật

### App Store Connect API key
- User tự tạo tại [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/integrations/api)
- Cần role **Admin** hoặc **App Manager**
- File `.p8` chỉ download được 1 lần
- Key format dùng cho Fastlane: `api_key_path` trỏ tới JSON file có dạng:
  ```json
  { "key_id": "...", "issuer_id": "...", "key": "-----BEGIN PRIVATE KEY-----\n..." }
  ```

### Fastlane upload_to_testflight
- Không cần Xcode nếu dùng API key authentication
- Flag `skip_waiting_for_build_processing: true` để không block job (Apple mất 5-15 phút xử lý)
- Sau khi upload xong, Apple trả về `build_number` → lưu vào `testflightBuildId`

### Security
- `privateKeyP8` nhạy cảm — không được log, không trả về qua API
- Cân nhắc lưu vào Secret Manager (tốt hơn) thay vì Firestore
- Tên secret: `ASC_KEY_{uid}_{appName}` (sanitize ký tự đặc biệt)

### Trigger Cloud Build từ API route
```ts
import { CloudBuildClient } from "@google-cloud/cloudbuild";

const client = new CloudBuildClient();
await client.runBuildTrigger({
  projectId: "ant-go",
  triggerId: SUBMIT_TRIGGER_ID,
  source: { substitutions: { _SUBMISSION_ID, _IPA_URL, _APP_NAME, _USER_ID } },
});
```
Cần tạo trigger `ANT-GO-SUBMIT` trong Cloud Build console trỏ tới `cloudbuild.submit.yaml`.
