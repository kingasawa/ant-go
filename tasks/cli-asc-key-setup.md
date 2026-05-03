# Task: CLI — Lưu App Store Connect API Key từ CLI

**Status:** done  
**Priority:** high  
**Created:** 2026-05-03  
**Branch:** feature/cli-asc-key-setup  
**PR:** —

---

## Mục tiêu

Khi user dùng CLI để setup app, cho phép họ cung cấp App Store Connect API Key (Key ID, Issuer ID, file .p8) ngay tại CLI — key được lưu lên server (Firestore, mã hoá AES-256-GCM) để dashboard không cần hỏi lại qua `AppStoreKeyModal`.

---

## Phân tích: Cái gì có thể tự động, cái gì không

### ✅ Tự động hoàn toàn (mode auto)
- Đăng nhập Apple Developer Portal qua `@expo/apple-utils` (Auth + Teams)
- `ApiKey.createAsync(authCtx)` — tạo key mới trên Apple Developer
- `newKey.downloadAsync()` — download .p8 ngay sau khi tạo (chỉ được 1 lần)
- `ApiKey.getAsync(authCtx)` — thử detect Issuer ID từ key hiện có
- Gửi (keyId, issuerId, privateKeyP8) lên server → lưu Firestore

### ⚠️ Cần nhập thủ công trong một số trường hợp
- **Issuer ID**: Không phải lúc nào cũng có trong response của Apple — nếu không detect được, CLI hỏi user nhập từ App Store Connect portal
- **Key đã có (.p8)**: Nếu user chọn mode "manual" hoặc muốn dùng key cũ, phải cung cấp path to .p8 (không thể re-download key cũ)

---

## Kiến trúc thay đổi

```
CLI                                    Server (Next.js API)
───                                    ────────────────────
ant-go configure-asc --app <appName>
  │
  ├── Hướng dẫn user tạo key trên ASC
  ├── Prompt: Key ID
  ├── Prompt: Issuer ID
  ├── Prompt: Path to .p8 file (hoặc paste nội dung)
  │
  ├── POST /api/apps/{appName}/app-store-key ──► Encrypt + lưu Firestore
  │   (dùng CLI token, cần CLI token auth)
  │
  └── ✓ Key đã lưu — dashboard không cần nhập lại
```

---

## Vấn đề cần giải quyết trước khi làm

### AUTH: CLI token vs Firebase ID Token

API `POST /api/apps/{appName}/app-store-key` hiện tại dùng `verifyIdToken` của Firebase Admin SDK — tức là chỉ nhận **Firebase ID Token** (token ngắn hạn của Firebase Auth), không nhận CLI token (JWT khác).

Khi CLI gọi API này, CLI chỉ có **CLI token** (lưu trong `~/.ant-go/config.json`). CLI token không phải Firebase ID Token.

→ Cần **thêm xử lý auth** cho CLI token tại route `app-store-key/route.ts`.

Có 2 hướng:
1. **Tái dùng cơ chế `resolveUidFromRequest`** (đã có ở các route khác, đọc được cả CLI token) — nếu đã có helper này.
2. **Tạo helper chung** hỗ trợ cả Firebase ID Token và CLI token.

---

## Subtasks

- [x] TASK-01: Kiểm tra auth helper hiện tại ở các API routes khác — `validateCliToken` đã có sẵn, hỗ trợ CLI token
- [x] TASK-02: Sửa `app/api/apps/[id]/app-store-key/route.ts` để hỗ trợ cả CLI token
- [x] TASK-03: Tạo CLI command `ant-go configure-asc` trong `cli/src/commands/configure-asc.js`
- [x] TASK-04: Đăng ký command `configure-asc` vào `cli/bin/ant-go.js`
- [x] TASK-05: Cập nhật tài liệu `/docs/submit-testflight-feature.md` và `cli/docs/`
- [x] TASK-06: Cập nhật `tasks/README.md` status
- [x] TASK-07: TypeScript check + next build
- [x] TASK-08: Commit + push + tạo PR

---

## Files sẽ thay đổi

| File | Thay đổi |
|---|---|
| `app/api/apps/[id]/app-store-key/route.ts` | Hỗ trợ CLI token auth |
| `cli/src/commands/configure-asc.js` | **New** — command mới |
| `cli/bin/ant-go.js` | Đăng ký command mới |
| `docs/submit-testflight-feature.md` | Cập nhật flow |
| `tasks/README.md` | Cập nhật status |

