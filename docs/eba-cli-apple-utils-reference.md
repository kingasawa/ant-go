# Tài liệu tham khảo: eba-cli & @expo/apple-utils

> **Mục đích:** Tránh việc kết luận sai "không thể làm được" khi thực tế đã có sẵn giải pháp trong `eba-cli` hoặc `@expo/apple-utils`.
>
> **Nguồn:** `/Users/trancatkhanh/Projects/eba-cli` — đọc toàn bộ source, kiểm tra thực tế ngày 2026-05-03.
>
> **Package đã có trong ant-go CLI:** `@expo/apple-utils@^2.1.21`

---

## Nguyên tắc quan trọng

> **Trước khi kết luận "không tự động được" với bất kỳ thao tác nào liên quan đến Apple Developer Portal hoặc App Store Connect → BẮT BUỘC kiểm tra eba-cli và danh sách dưới đây trước.**

---

## 1. Authentication — Apple Developer Portal

**File tham khảo:** `eba-cli/src/auth/apple.js`

| Tính năng | API | Ghi chú |
|---|---|---|
| Đăng nhập Apple ID + password | `Auth.loginAsync({ username, password })` | Hỗ trợ 2FA callback |
| Restore session từ cookie | `Auth.loginAsync({ username, cookies: true })` | Cache < 1 giờ |
| Chọn team | `Teams.selectTeamAsync()` hoặc `Teams.selectTeamAsync({ teamId })` | Trả về `{ teamId, name }` |
| Lấy danh sách team | `Teams.getTeamsAsync(authCtx)` | Trả về mảng `[{ teamId, name, type }]` |

**Quan trọng:** Sau khi `Auth.loginAsync`, kết quả trả về dạng `result.context ?? result` — đây là `authCtx` dùng cho mọi API khác.

---

## 2. App Store Connect API Key

**File tham khảo:** `eba-cli/src/api/asc.js` và `eba-cli/src/commands/workflow.js` (`autoSetupApiKey`)

| Tính năng | API | Ghi chú |
|---|---|---|
| Liệt kê keys hiện có | `ApiKey.getAsync(authCtx)` | Trả về mảng key objects |
| Tạo key mới | `ApiKey.createAsync(authCtx, { nickname, roles, allAppsVisible, keyType })` | `keyType: ApiKeyType.PUBLIC_API` |
| **Download file .p8** | `newKey.downloadAsync()` | ⚠️ Chỉ được **1 lần duy nhất** ngay sau khi tạo |
| Thu hồi key | `key.revokeAsync()` | Instance method |
| **Issuer ID** | `existingKeys[0]?.attributes?.provider?.id` | Không phải lúc nào cũng có → cần fallback hỏi user |

**Ví dụ thực tế trong ant-go:** `cli/src/commands/configure-asc.js` (đã triển khai)

---

## 3. Certificates

**File tham khảo:** `eba-cli/src/commands/certs.js`

| Tính năng | API | Ghi chú |
|---|---|---|
| Liệt kê certificates | `Certificate.getAsync(authCtx, { query: { filter: { certificateType: [...] } } })` | |
| Tạo cert mới + xuất .p12 | `createCertificateAndP12Async(authCtx, { certificateType })` | Trả `{ certificateP12, password }` |
| Reuse cert hiện có | `createCertificateAndP12Async(authCtx, { reuseExistingCertificate: true })` | |
| Thu hồi cert | `Certificate.deleteAsync(authCtx, { id })` | |

**Các loại cert:** `CertificateType.DISTRIBUTION`, `CertificateType.DEVELOPMENT`, `CertificateType.IOS_DISTRIBUTION`, `CertificateType.IOS_DEVELOPMENT`, `CertificateType.APPLE_PUSH_SERVICES`, `CertificateType.MAC_APP_DISTRIBUTION`, `CertificateType.DEVELOPER_ID_APPLICATION`

---

## 4. Provisioning Profiles

**File tham khảo:** `eba-cli/src/commands/profiles.js`

| Tính năng | API | Ghi chú |
|---|---|---|
| Liệt kê profiles | `Profile.getAsync(authCtx, { query: { filter: { profileType: [...] } } })` | |
| Tạo profile | `Profile.createAsync(authCtx, { bundleId, certificates, devices, name, profileType })` | |
| Xem chi tiết profile (nội dung .mobileprovision) | `Profile.infoAsync(authCtx, { id })` | Lấy `attributes.profileContent` |
| Xoá profile | `Profile.deleteAsync(authCtx, { id })` | |

**Các loại profile:** `ProfileType.IOS_APP_STORE`, `ProfileType.IOS_APP_DEVELOPMENT`, `ProfileType.IOS_APP_ADHOC`, `ProfileType.IOS_APP_INHOUSE`, `ProfileType.TVOS_*`, `ProfileType.MAC_*`

---

## 5. Bundle IDs (App IDs)

**File tham khảo:** `eba-cli/src/commands/bundle-ids.js`

| Tính năng | API | Ghi chú |
|---|---|---|
| Liệt kê bundle IDs | `BundleId.getAsync(authCtx, { query: { filter: { platform: BundleIdPlatform.IOS } } })` | |
| Tạo bundle ID mới | `BundleId.createAsync(authCtx, { identifier, name, platform })` | |
| Liệt kê capabilities | `BundleIdCapability.getAsync(authCtx, { bundleId: b.id })` | |

**Platform:** `BundleIdPlatform.IOS`, `BundleIdPlatform.MAC_OS`, `BundleIdPlatform.UNIVERSAL`

---

## 6. Devices

**File tham khảo:** `eba-cli/src/commands/devices.js`

| Tính năng | API | Ghi chú |
|---|---|---|
| Liệt kê devices | `Device.getAsync(authCtx)` | Trả về mảng, mỗi device có `attributes.udid`, `name`, `deviceClass`, `status` |
| Đăng ký device mới | `Device.createAsync(authCtx, { name, udid, platform, deviceClass })` | `platform: 'IOS'` |
| DeviceClass | `DeviceClass.IPHONE`, `IPAD`, `MAC`, `APPLE_WATCH`, `APPLE_TV`, `IPOD` | |
| DeviceStatus | `DeviceStatus.DISABLED` | Dùng để filter |

---

## 7. App Store Connect REST API (JWT)

**File tham khảo:** `eba-cli/src/api/asc-api.js`

Đây là API **riêng biệt** với Developer Portal — dùng JWT token (không phải cookie session). Cần `keyId`, `issuerId`, `privateKey` để sinh JWT.

| Tính năng | Function | Endpoint |
|---|---|---|
| Sinh JWT | `generateJwt({ issuerId, keyId, privateKey })` | — |
| Xcode Cloud: lấy CI product | `getCiProduct(jwt, ascAppId)` | `GET /v1/ciProducts` |
| Xcode Cloud: lấy workflows | `getCiWorkflows(jwt, productId)` | `GET /v1/ciProducts/{id}/workflows` |
| Xcode Cloud: tạo workflow | `createCiWorkflow(jwt, {...})` | `POST /v1/ciWorkflows` |
| SCM: liệt kê repos | `getScmRepositories(jwt)` | `GET /v1/scmRepositories` |
| SCM: poll repo mới | `pollForNewRepository(jwt, knownIds)` | polling `GET /v1/scmRepositories` |
| Xcode versions | `getXcodeVersions(jwt)` | `GET /v1/ciXcodeVersions` |
| macOS versions | `getMacOsVersions(jwt)` | `GET /v1/ciMacOsVersions` |

---

## 8. App Store Connect Web Session (Cookie-based)

**File tham khảo:** `eba-cli/src/api/asc.js`

Dùng cookie session sau khi đăng nhập qua `@expo/apple-utils`. Khác với JWT API ở trên.

| Tính năng | Function | Ghi chú |
|---|---|---|
| Gọi ASC API với cookie | `ascFetch(path, { method, body })` | Dùng `CookieFileCache.getCookiesJSON()` |
| Liệt kê API keys qua web | `listApiKeys(authState)` → `Keys.getKeysAsync(authState)` | |
| Tạo API key qua web | `createApiKey(authState, name)` → `Keys.createKeyAsync(authState, { name })` | |
| Download .p8 qua web | `downloadPrivateKey(authState, keyId)` → `Keys.downloadKeyAsync(authState, { id: keyId })` | Chỉ 1 lần |

---

## 9. Cách import trong ant-go CLI (CommonJS)

ant-go CLI dùng **CommonJS** (`require`), khác với eba-cli dùng ES Modules (`import`).

```javascript
// Đúng cho ant-go CLI:
const {
  Auth, Teams,
  Certificate, CertificateType, createCertificateAndP12Async,
  BundleId, BundleIdPlatform, BundleIdCapability, CapabilityType,
  Profile, ProfileType,
  Device, DeviceClass, DeviceStatus,
  ApiKey, ApiKeyType,
  Keys,
} = require('@expo/apple-utils');
```

---

## 10. Lịch sử: Những lần kết luận sai đã xảy ra

| Lần | Kết luận sai | Sự thật |
|---|---|---|
| #1 | "Không thể lấy App Store Connect API Key tự động" | `ApiKey.createAsync` + `downloadAsync` làm được hoàn toàn |
| #2 | Plan ban đầu cho `configure-asc` bảo user nhập thủ công 100% | eba-cli/workflow.js đã implement `autoSetupApiKey` — tự tạo + download |
| #3 | _(user nhắc lần 3)_ | Tài liệu này được tạo ra để không tái phạm |

