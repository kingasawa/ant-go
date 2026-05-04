# Credit System — Hệ thống quản lý lượt build

Tài liệu mô tả kiến trúc, luồng hoạt động và cách triển khai hệ thống credit dùng để quản lý lượt build trên ant-go.

---

## Tổng quan

```
CLI                         Dashboard (Next.js)             Mac Build Server
 │                                  │                               │
 ├── ant-go build                   │                               │
 ├── POST /api/builds ─────────────►│ checkAndResetCredits()        │
 │                                  │ credits check (≤ 0 → 402)     │
 │                                  │ tạo job Firestore             │
 │   ◄── { jobId, ... }             │                               │
 │   ... upload + start ...         │                               │
 │                                  │                   build xong ─┤
 │                                  │◄── POST /api/builds/:id/complete
 │                                  │    { status, durationMs }     │
 │                                  │                               │
 │                                  │ deductCredit()                │
 │                                  │ update builds/{id}.status     │
 │                                  │ write creditHistory           │
```

---

## Plan & Credit

| Plan | Credits/tháng | Giới hạn app | Ghi chú |
|---|---|---|---|
| `free` | 15 | 3 | Reset ngày 1 hàng tháng |
| `starter` | 50 | unlimited | Reset ngày 1 hàng tháng |
| `pro` | 500 | unlimited | Reset ngày 1 hàng tháng |
| `enterprise` | unlimited | unlimited | planCredits = -1, không trừ credit |

### Credit deduction theo kết quả build

| Kết quả | Điều kiện | Credit trừ |
|---|---|---|
| Thành công | status = `success` | **−1** |
| Thất bại nhanh | status = `failed`, durationMs < 3 phút | **−0.2** |
| Thất bại chậm | status = `failed`, durationMs ≥ 3 phút | **−0.4** |
| Enterprise | planCredits === −1 | **0** (không trừ) |

---

## Firestore Schema

### `users/{uid}` — fields mới

```
credits:          number      // Credit hiện tại. FREE=15, Starter=50, Pro=500
planCredits:      number      // Credit max của plan (-1 = unlimited/enterprise)
creditsResetAt:   Timestamp   // Ngày 1 đầu tháng tiếp theo — trigger lazy reset
```

> `freeBuildsRemaining` đã bị xoá, thay bằng `credits` + `planCredits`.

### `users/{uid}/creditHistory/{auto-id}` — collection mới

```
buildId:       string
amount:        number        // âm: -1 | -0.2 | -0.4
reason:        "success" | "failed_fast" | "failed_slow"
balanceBefore: number
balanceAfter:  number
createdAt:     Timestamp
```

### `builds/{jobId}` — fields thêm

```
startedAt:    Timestamp   // Mac server ghi khi nhận job (in_progress)
completedAt:  Timestamp   // Dashboard ghi sau khi nhận POST /complete
durationMs:   number      // Được báo bởi Mac server, Dashboard ghi vào Firestore
```

---

## API Endpoints

### `POST /api/builds` — Credit check trước khi tạo job

Chạy trước khi `prepareBuild()`:

1. `checkAndResetCredits(uid)` — lazy reset nếu `creditsResetAt <= now`.
2. Đọc `credits` và `planCredits` từ `users/{uid}`.
3. Nếu `planCredits !== -1` và `credits <= 0` → trả `402 { error: "Hết credit..." }`.

---

### `POST /api/builds/:id/complete` — Mac server báo xong

**Auth:** header `x-internal-secret: <INTERNAL_BUILD_SECRET>`

**Body từ Mac server:**
```json
{
  "status": "success" | "failed",
  "durationMs": 185000
}
```

**Logic:**
1. Validate `INTERNAL_BUILD_SECRET`.
2. Đọc `builds/{id}` → lấy `userId`.
3. Cập nhật Firestore `builds/{id}`:
   ```
   status:      "success" | "failed"
   completedAt: serverTimestamp()
   durationMs:  <số ms từ Mac server>
   ```
4. Gọi `deductCredit(userId, buildId, status, durationMs)` — Firestore transaction.
5. Trả `{ ok: true }`.

---

### `GET /api/cron/reset-credits` — Reset credit hàng tháng

**Auth:** header `x-cron-secret: <CRON_SECRET>`

**Logic:**
1. Query `users` có `creditsResetAt <= now`.
2. Batch update: `credits = planCredits`, `creditsResetAt = ngày 1 tháng sau`.

---

### `POST /api/apps` — Tạo app (giới hạn FREE plan)

**Auth:** Firebase ID token (browser)

**Logic:**
1. Validate ID token → lấy `uid`.
2. Đọc `plan` từ `users/{uid}`.
3. Nếu FREE plan: đếm app của user. Nếu `count ≥ 3` → `403`.
4. Tạo app document → trả `{ appId, appName }`.

---

## Credit Service (`lib/credit.service.ts`)

```ts
// Tính số credit cần trừ
function calcCreditDeduction(status: "success"|"failed", durationMs: number): number
// success → -1
// failed < 3min → -0.2
// failed ≥ 3min → -0.4

// Lazy reset credit nếu đã qua creditsResetAt (Firestore transaction)
async function checkAndResetCredits(uid: string): Promise<void>

// Trừ credit sau build — Firestore transaction toàn vẹn
async function deductCredit(
  uid: string,
  buildId: string,
  status: "success" | "failed",
  durationMs: number
): Promise<void>
```

---

## Mac Server — Luồng gọi API

Thay vì ghi `status` trực tiếp vào Firestore, Mac server (ant-go-builder) gọi Dashboard API:

**Khi nhận job (`in_progress`):**
```js
await firebase.updateBuild(jobId, {
  status: 'in_progress',
  step: 'initialising',
  startedAt: new Date().toISOString(),  // Mac server tự ghi
});
const buildStartedAt = Date.now();  // track trong memory để tính durationMs
```

**Khi build xong (success hoặc failed):**
```js
// 1. Ghi metadata (ipaUrl, logs, error, etc.) vào Firestore — KHÔNG ghi status
await firebase.updateBuild(jobId, {
  step: 'done' | 'error',
  ipaUrl, dsymUrl, manifestUrl, buildLogUrl, error, ...
});

// 2. Gọi Dashboard API — Dashboard xử lý status + deduct credit
const durationMs = Date.now() - buildStartedAt;
await callDashboardComplete(jobId, 'success' | 'failed', durationMs);
```

**Biến môi trường cần thêm vào `.env` của Mac server:**
```
DASHBOARD_URL=https://ant-go.as.r.appspot.com
INTERNAL_BUILD_SECRET=<cùng giá trị với env.yaml của Dashboard>
```

---

## Cloud Scheduler — Cron reset credit

```
Job name: reset-credits-monthly
Schedule: 0 0 1 * *   (00:00 ngày 1 mỗi tháng)
Timezone: Asia/Ho_Chi_Minh
URL: https://ant-go.as.r.appspot.com/api/cron/reset-credits
Header: x-cron-secret: <CRON_SECRET>
Method: GET
Project: ant-go
Location: asia-southeast1
```

---

## Dashboard — Trang Usage

Route: `/account/usage`

**Sections:**

1. **Credit Card** — Progress bar `credits / planCredits` (đỏ khi < 20%), ngày reset kế tiếp.
2. **App Limit Card** — `appCount / PLAN_APP_LIMIT[plan]`, link "Nâng cấp" nếu FREE gần đầy.
3. **Lịch sử trừ credit** — Table từ `users/{uid}/creditHistory` (order `createdAt desc`, limit 50):
   - Thời gian | Build ID (link) | Kết quả | Thời gian build | Credit trừ | Số dư sau

---

## Stripe Webhook — Update credit khi đổi plan

File: `app/api/webhooks/stripe/route.ts`

Khi event `checkout.session.completed` hoặc `customer.subscription.updated`:
- Xác định `newPlan` từ Stripe price ID.
- Update Firestore `users/{uid}`:
  ```ts
  credits:        PLAN_CREDITS[newPlan],   // reset về max mới
  planCredits:    PLAN_CREDITS[newPlan],
  creditsResetAt: <ngày 1 tháng sau>,
  ```

---

## Biến môi trường

| Biến | Dùng ở | Ghi chú |
|---|---|---|
| `INTERNAL_BUILD_SECRET` | Dashboard (`env.yaml`) + Mac server (`.env`) | Phải cùng giá trị |
| `CRON_SECRET` | Dashboard (`env.yaml`) + Cloud Scheduler header | |

---

## Firestore Rules

```
match /users/{userId}/creditHistory/{histId} {
  allow read, write: if false;  // chỉ Admin SDK
}
```

---

## Constants

```ts
// lib/createUserProfile.ts
export const PLAN_CREDITS: Record<string, number> = {
  free:       15,
  starter:    50,
  pro:        500,
  enterprise: -1,  // -1 = unlimited
};

export const PLAN_APP_LIMIT: Record<string, number> = {
  free:       3,
  starter:    -1,
  pro:        -1,
  enterprise: -1,
};
```

---

## Rủi ro & Giải pháp

| Vấn đề | Giải pháp |
|---|---|
| Race condition khi trừ credit | `deductCredit()` dùng Firestore **transaction** |
| Cron chạy nhiều lần (at-least-once) | `checkAndResetCredits()` cũng check `creditsResetAt > now` → idempotent |
| Mac server không set DASHBOARD_URL | `callDashboardComplete()` log warning + continue (không crash) |
| Dashboard chưa deploy khi Mac server gọi /complete | Deploy Dashboard **trước** khi restart Mac server với env mới |

