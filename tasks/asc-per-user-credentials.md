# Task: ASC Credentials per-user + CLI login integration

**Status:** in_progress  
**Priority:** high  
**Created:** 2026-05-03  
**Branch:** feature/asc-per-user-credentials  
**PR:** —

---

## Mục tiêu

1. Lưu ASC credentials **theo user** (không theo app) — `users/{uid}/asc_credentials`
2. CLI login lần đầu → tự động chạy setup ASC key (Apple login → tạo key → download .p8)
3. Dashboard Settings → hiển thị trạng thái ASC key, cho phép nhập/sửa Key ID & Issuer ID
4. Khi submit TestFlight → kiểm tra credentials, nếu thiếu → hiện right panel hướng dẫn

---

## Schema mới

```
users/{uid}/asc_credentials   (single doc per user, không phân theo app)
  encryptedKey:   string     // .p8 đã mã hoá AES-256-GCM
  keyId:          string | null
  issuerId:       string | null
  updatedAt:      Timestamp
```

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `lib/asc-key.ts` | `getAscKeyForUser(uid)` — bỏ param `appName` |
| `app/api/user/asc-credentials/route.ts` | **Mới** — GET/POST per-user credentials |
| `app/api/apps/[id]/submissions/route.ts` | Dùng schema mới, support CLI token auth |
| `app/api/apps/[id]/app-store-key/route.ts` | Redirect/proxy sang per-user path |
| `scripts/fetch-asc-key.js` | Đọc từ `users/{uid}/asc_credentials` (bỏ `appName`) |
| `app/(account)/account/settings/page.tsx` | Thêm section "Apple Developer Credentials" |
| `app/components/AscMissingPanel.tsx` | **Mới** — Right drawer khi thiếu credentials |
| `app/account/app/[appName]/builds/page.tsx` | Submit → check credentials → show panel |
| `cli/src/commands/auth.js` | Sau login → prompt setup ASC |
| `cli/src/commands/configure-asc.js` | Dùng `/api/user/asc-credentials`, bỏ `--app` |
| `tasks/README.md` | Cập nhật status |

---

## Subtasks

- [x] TASK-01: Cập nhật `lib/asc-key.ts` — đọc từ per-user path
- [x] TASK-02: Tạo `app/api/user/asc-credentials/route.ts`
- [x] TASK-03: Cập nhật `app/api/apps/[id]/app-store-key/route.ts` — dùng per-user path
- [x] TASK-04: Cập nhật `app/api/apps/[id]/submissions/route.ts` — dùng lib mới + CLI token
- [x] TASK-05: Cập nhật `scripts/fetch-asc-key.js` — đọc per-user, bỏ appName param
- [x] TASK-06: Tạo `app/components/AscMissingPanel.tsx` — right drawer
- [x] TASK-07: Cập nhật `app/account/app/[appName]/builds/page.tsx` — dùng panel mới
- [x] TASK-08: Cập nhật Settings page — section Apple Developer Credentials
- [x] TASK-09: Cập nhật CLI `auth.js` — setup ASC sau login
- [x] TASK-10: Cập nhật CLI `configure-asc.js` — bỏ --app, dùng endpoint mới
- [x] TASK-11: TypeScript check + next build
- [x] TASK-12: Commit + push + PR


