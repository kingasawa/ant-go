# CLI Token Lifecycle — Firestore `cli_tokens`

Mô tả toàn bộ vòng đời của CLI token: tạo, sử dụng, gia hạn, thu hồi và dọn dẹp.

---

## Tổng quan

CLI token là một **UUID ngẫu nhiên** dùng để xác thực các request từ CLI (`ant build`, `ant auth whoami`, ...) lên Dashboard API. Token được lưu như một document trong Firestore collection `cli_tokens`.

```
CLI ~/.ant-go/config.json          Firestore cli_tokens/{uuid}
  token: "uuid-v4"          ←→     uid, email, plan, expiresAt, ...
  refreshToken: "..."
```

---

## Firestore Schema

```
cli_tokens/{uuid}
  uid:           string     ← linked tới users/{uid}
  email:         string
  displayName:   string | null
  photoURL:      string | null
  plan:          "free" | "pro" | "enterprise"
  builds:        number
  credits:       number
  planCredits:   number
  refreshToken:  string     ← Firebase refresh token, dùng để gia hạn
  expiresAt:     timestamp  ← hết hạn sau 24h kể từ khi tạo
  revoked:       bool       ← true khi user logout
  createdAt:     timestamp
```

---

## Vòng đời token

### 1. Tạo token — Đăng nhập

Có 3 flow tạo token, đều tạo ra 1 document mới trong `cli_tokens`:

#### a) Email/Password login
```
ant auth login
  → POST /api/auth/cli-login { email, password }
  → Firebase REST API xác thực email/password → lấy idToken + refreshToken
  → server verify idToken → lấy uid
  → tạo cli_tokens/{uuid} với expiresAt = now + 24h
  → CLI lưu { token: uuid, refreshToken } vào ~/.ant-go/config.json
```

#### b) Browser (Google OAuth) login
```
ant auth login --browser
  → CLI mở browser → user đăng nhập Google → Firebase trả idToken
  → CLI gọi POST /api/auth/cli-token { idToken }
  → server verify idToken → tạo cli_tokens/{uuid}
  → CLI lưu token vào ~/.ant-go/config.json
```

#### c) Tự gia hạn (auto-refresh)
```
CLI gọi API → nhận 401
  → POST /api/auth/cli-refresh { refreshToken }
  → Firebase Token Exchange API → idToken mới
  → server tạo cli_tokens/{uuid_mới} với expiresAt = now + 24h
  → CLI cập nhật ~/.ant-go/config.json với token mới
```

> **Lưu ý:** Mỗi lần login hoặc refresh tạo ra **1 document mới** — không overwrite document cũ. 1 user có thể có nhiều token song song (đăng nhập từ nhiều máy).

---

### 2. Sử dụng token

Mọi API call từ CLI đều gửi token qua header:
```
Authorization: Bearer <uuid>
```

Server gọi `validateCliToken(token)` trong `lib/cli-auth.service.ts`:

```
1. Đọc cli_tokens/{uuid}
2. Nếu không tồn tại → return null (401)
3. Nếu revoked === true → xóa doc ngay (lazy delete) → return null (401)
4. Nếu expiresAt < now → xóa doc ngay (lazy delete) → return null (401)
5. Return CliSession { uid, email, plan, credits, ... }
```

---

### 3. Thu hồi token — Logout

```
ant auth logout
  → DELETE /api/auth/cli-token
     Header: Authorization: Bearer <uuid>
  → server set cli_tokens/{uuid}.revoked = true
  → CLI xóa ~/.ant-go/config.json
```

Lần validate tiếp theo sẽ phát hiện `revoked = true` và xóa doc (lazy delete).

---

### 4. Dọn dẹp token — 2 cơ chế song song

#### Cơ chế 1 — Lazy Delete (tức thì)

Trong `validateCliToken()`, khi phát hiện token **revoked** hoặc **expired**:
- Gọi `doc.ref.delete()` ngay lập tức (không await, không block response)
- Áp dụng cho mọi token còn được gọi lại (user dùng máy cũ, token cũ, ...)

#### Cơ chế 2 — Firestore TTL (tự động, ~1-2h delay)

Firestore TTL Policy được bật trên field `expiresAt` của collection `cli_tokens`:
```
Collection group: cli_tokens
Field:            expiresAt
State:            ACTIVE
```

Google tự động xóa document khi `expiresAt` đã qua — bao gồm cả những token **không ai gọi lại** (máy cũ bị bỏ, user không logout).

> TTL delete không tốn Firestore read/write quota, hoàn toàn miễn phí.

---

## Sơ đồ vòng đời

```
ant auth login
      │
      ▼
cli_tokens/{uuid}
  expiresAt = now + 24h
  revoked   = false
      │
      ├── CLI gọi API (build, devices, ...)
      │     validateCliToken() → CliSession
      │
      ├── 24h trôi qua → expiresAt hết hạn
      │     ├── CLI tự refresh → cli_tokens/{uuid_mới}
      │     └── Nếu không refresh:
      │           └── next validate → lazy delete doc
      │               hoặc Firestore TTL tự xóa
      │
      └── ant auth logout
            revoked = true
            └── next validate → lazy delete doc
```

---

## Bảng tóm tắt cơ chế dọn dẹp

| Tình huống | Cơ chế xóa | Thời điểm xóa |
|---|---|---|
| Token expired, CLI gọi API lại | Lazy delete | Tức thì khi validate |
| Token revoked (logout), CLI gọi API lại | Lazy delete | Tức thì khi validate |  
| Token expired, không ai gọi lại | Firestore TTL | ~1-2h sau `expiresAt` |
| Token revoked, không ai gọi lại | Firestore TTL | ~1-2h sau `expiresAt` |

---

## Files liên quan

| File | Vai trò |
|---|---|
| `lib/cli-auth.service.ts` | `validateCliToken()` — validate + lazy delete |
| `app/api/auth/cli-login/route.ts` | `POST /api/auth/cli-login` — email/password login |
| `app/api/auth/cli-token/route.ts` | `POST /api/auth/cli-token` — browser login; `DELETE` — logout/revoke |
| `app/api/auth/cli-refresh/route.ts` | `POST /api/auth/cli-refresh` — tự gia hạn token |
| `cli/src/commands/auth.js` | CLI: `ant auth login`, `logout`, `whoami`, `ensureToken()` |
| `cli/src/config.js` | Đọc/ghi `~/.ant-go/config.json` |

