
# Task: credit-system

**Status:** `in_progress`
**PR:** —

## Mô tả

Xây dựng hệ thống credit để quản lý lượt build:

- Tài khoản FREE mặc định: **15 credit**, reset ngày 1 mỗi tháng.
- Mỗi build kết thúc trừ credit theo kết quả:
  - Thành công: **−1 credit**
  - Thất bại < 3 phút: **−0.2 credit**
  - Thất bại ≥ 3 phút: **−0.4 credit**
- Plan FREE: tối đa **3 app**, từ app thứ 4 phải nâng cấp.
- Trang **Usage**: thống kê credit còn lại, app đã tạo, lịch sử trừ credit.

**Quyết định kiến trúc đã xác nhận:**
- Hướng A: Mac build server gọi `POST /api/builds/:id/complete` khi build kết thúc (thay vì write Firestore trực tiếp).
  Mac server source tại: `D:/Projects/ant-go-builder`
- Không có user thực → có thể thay đổi schema thoải mái, xóa `freeBuildsRemaining`.

---

## Firestore Schema thay đổi

### `users/{uid}` — thêm / đổi

```
credits:          number      // thay freeBuildsRemaining. FREE=15, Starter=50, Pro=500
creditsResetAt:   Timestamp   // ngày 1 đầu tháng tiếp theo
planCredits:      number      // snapshot credit max của plan hiện tại (dùng tính % bar UI)
```

`freeBuildsRemaining` → **xóa** (không có user thực, không cần migrate).

### `users/{uid}/creditHistory/{auto-id}` — **collection mới**

```
buildId:       string
amount:        number        // âm: -1 | -0.2 | -0.4
reason:        "success" | "failed_fast" | "failed_slow"
balanceBefore: number
balanceAfter:  number
createdAt:     Timestamp
```

### `builds/{jobId}` — thêm field

```
startedAt:    Timestamp   // Mac server ghi khi nhận job (in_progress)
completedAt:  Timestamp   // Mac server ghi khi xong
durationMs:   number      // server tính: completedAt - startedAt
```

---

## Hằng số plan

```ts
export const PLAN_CREDITS: Record<string, number> = {
  free:       15,
  starter:    50,
  pro:        500,
  enterprise: -1,   // unlimited (-1 = không trừ credit)
};

export const PLAN_APP_LIMIT: Record<string, number> = {
  free:       3,
  starter:    -1,   // unlimited
  pro:        -1,
  enterprise: -1,
};
```

---

## Phạm vi thay đổi

| File | Action | Mô tả |
|---|---|---|
| `lib/createUserProfile.ts` | Sửa | Đổi `freeBuildsRemaining: 10` → `credits: 15`, `planCredits: 15`, thêm `creditsResetAt`, cập nhật `UserProfile` interface, thêm `PLAN_CREDITS` + `PLAN_APP_LIMIT` |
| `lib/credit.service.ts` | **Tạo mới** | `deductCredit()`, `checkAndResetCredits()`, `getCreditsInfo()` |
| `app/api/builds/[id]/complete/route.ts` | **Tạo mới** | Endpoint Mac server gọi khi build xong — tính duration, update status, deduct credit |
| `app/api/builds/route.ts` | Sửa | Thêm credit check + lazy reset trước khi tạo build job |
| `app/api/apps/route.ts` | **Tạo mới** | `POST /api/apps` — tạo app với server-side giới hạn 3 app cho FREE plan |
| `app/api/user/me/route.ts` | Sửa | Trả `credits`, `planCredits`, `creditsResetAt` thay `freeBuildsRemaining` |
| `app/api/cron/reset-credits/route.ts` | **Tạo mới** | Cron endpoint reset credit hàng tháng (protected bằng `CRON_SECRET`) |
| `app/api/webhooks/stripe/route.ts` | Sửa | Khi upgrade plan: cập nhật `credits`, `planCredits`, `creditsResetAt` |
| `app/(account)/account/apps/page.tsx` | Sửa | `handleCreate` gọi `POST /api/apps` thay vì `addDoc()` trực tiếp |
| `app/(account)/account/usage/page.tsx` | **Tạo mới** | Trang Usage: credit bar, app usage, bảng creditHistory |
| `app/(account)/account/layout.tsx` | Sửa | Thêm nav item "Usage" vào sidebar |
| `app/(account)/account/overview/page.tsx` | Sửa | Dùng `credits/planCredits` thay hardcode `freeBuildsRemaining` |
| `cli/src/commands/build.js` | Sửa | Hiển thị `Credits còn lại: X`, check `credits <= 0` thay `freeBuildsRemaining` |
| `cli/src/api.js` | Sửa | Map `credits` từ response `/api/user/me` |
| `firestore.rules` | Sửa | Thêm rule `creditHistory` (chỉ Admin SDK) |
| **`D:/Projects/ant-go-builder`** | Sửa | Mac server: gọi `POST /api/builds/:id/complete` thay vì write Firestore trực tiếp |

---

## Subtasks

- [ ] TASK-01  Schema & types — `lib/createUserProfile.ts`
- [ ] TASK-02  Credit service — `lib/credit.service.ts`
- [ ] TASK-03  Dashboard — `POST /api/builds/:id/complete` (route mới cho Mac server)
- [ ] TASK-04  Dashboard — Credit check trong `POST /api/builds`
- [ ] TASK-05  Dashboard — `POST /api/apps` (route mới, giới hạn FREE plan)
- [ ] TASK-06  Dashboard — `GET /api/user/me` trả `credits`
- [ ] TASK-07  Dashboard — Cron reset credit `GET /api/cron/reset-credits`
- [ ] TASK-08  Dashboard — Stripe webhook cập nhật credit khi đổi plan
- [ ] TASK-09  Dashboard — Trang Usage (`app/(account)/account/usage/`)
- [ ] TASK-10  Dashboard — Sửa Overview page + Apps page
- [ ] TASK-11  CLI — Sửa `fetchUserInfo` + hiển thị credit trong build
- [ ] TASK-12  Mac server — Sửa ant-go-builder gọi `/api/builds/:id/complete`
- [ ] TASK-13  Firestore rules — thêm rule `creditHistory`
- [ ] TASK-14  Docs — Cập nhật tài liệu

---

## Chi tiết từng subtask

### TASK-01 — Schema & types

**File:** `lib/createUserProfile.ts`

```ts
export const PLAN_CREDITS: Record<string, number> = {
  free: 15, starter: 50, pro: 500, enterprise: -1,
};
export const PLAN_APP_LIMIT: Record<string, number> = {
  free: 3, starter: -1, pro: -1, enterprise: -1,
};

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: UserPlan;
  builds: number;
  credits: number;          // thay freeBuildsRemaining
  planCredits: number;      // credit max của plan (dùng cho UI progress bar)
  creditsResetAt: unknown;  // Timestamp ngày 1 tháng sau
  createdAt: unknown;
  updatedAt: unknown;
}
```

Trong `createUserProfileIfNeeded()`: khởi tạo `credits: 15`, `planCredits: 15`, `creditsResetAt` = timestamp ngày 1 tháng sau (dùng Admin SDK trong server context hoặc tính `Date` thuần).

**Lưu ý:** `createUserProfileIfNeeded` đang dùng client-side Firebase SDK. `creditsResetAt` có thể tính bằng `new Date(year, month+1, 1)` thuần, không cần server timestamp.

---

### TASK-02 — Credit service

**File:** `lib/credit.service.ts` (mới, dùng Admin SDK)

```ts
/**
 * Tính amount cần trừ dựa vào kết quả build và thời gian (ms).
 * success → -1 | failed < 3min → -0.2 | failed ≥ 3min → -0.4
 * Enterprise (planCredits === -1) → không trừ, return 0.
 */
export function calcCreditDeduction(status: "success"|"failed", durationMs: number): number

/**
 * Lazy-reset credit nếu đã qua creditsResetAt.
 * Dùng Firestore transaction để tránh race condition.
 */
export async function checkAndResetCredits(uid: string): Promise<void>

/**
 * Trừ credit sau khi build kết thúc.
 * Dùng Firestore transaction: đọc balance → tính amount → ghi creditHistory → update credits.
 */
export async function deductCredit(
  uid: string,
  buildId: string,
  status: "success" | "failed",
  durationMs: number
): Promise<void>
```

---

### TASK-03 — `POST /api/builds/:id/complete`

**File:** `app/api/builds/[id]/complete/route.ts` (mới)

Auth: header `x-internal-secret: <INTERNAL_BUILD_SECRET>` (thêm vào `env.yaml` + Secret Manager).

Body từ Mac server:
```json
{
  "status": "success" | "failed",
  "durationMs": 185000
}
```

Logic:
1. Validate `INTERNAL_BUILD_SECRET`.
2. Đọc `builds/{id}` → lấy `userId`.
3. Cập nhật `builds/{id}`: `status`, `completedAt`, `durationMs`.
4. Gọi `deductCredit(userId, id, status, durationMs)`.
5. Trả `{ ok: true }`.

**Lưu ý route conflict:** `app/api/builds/[id]/` đã có `start/`, `log/`, `mark-failed/`, `rebuild/`. Thêm `complete/` cùng cấp — an toàn vì không phải dynamic segment.

---

### TASK-04 — Credit check trong `POST /api/builds`

**File:** `app/api/builds/route.ts`

Sau khi validate CLI token, trước khi gọi `prepareBuild()`:

```ts
// Lazy reset credit nếu đầu tháng mới
await checkAndResetCredits(session.uid);

// Đọc credit hiện tại
const userSnap = await db.collection("users").doc(session.uid).get();
const credits = userSnap.data()?.credits ?? 0;
const planCredits = userSnap.data()?.planCredits ?? 15;

// -1 = unlimited (enterprise)
if (planCredits !== -1 && credits <= 0) {
  return NextResponse.json(
    { error: "Hết credit. Nâng cấp plan hoặc chờ reset đầu tháng." },
    { status: 402 }
  );
}
```

---

### TASK-05 — `POST /api/apps`

**File:** `app/api/apps/route.ts` (mới)

**Lưu ý quan trọng:** `app/api/apps/` đã có `[id]/` (dynamic segment). Route mới `route.ts` đặt trực tiếp tại `app/api/apps/route.ts` (cùng folder, không conflict — Next.js cho phép `route.ts` và `[id]/` cùng tồn tại trong một folder).

Auth: Firebase ID token (browser session).

Logic:
1. Validate ID token → lấy `uid`.
2. Đọc `plan` từ `users/{uid}`.
3. Nếu FREE plan: đếm `apps where userId == uid`.
4. Nếu count ≥ 3 → trả `403 { error: "FREE plan chỉ tạo được 3 app. Nâng cấp để tạo thêm." }`.
5. Tạo app document trong Firestore → trả `{ appId, appName }`.

---

### TASK-06 — `GET /api/user/me`

**File:** `app/api/user/me/route.ts`

Thay `freeBuildsRemaining` bằng:
```ts
credits:         userData.credits         ?? 0,
planCredits:     userData.planCredits     ?? 15,
creditsResetAt:  userData.creditsResetAt?.toDate?.()?.toISOString() ?? null,
```

---

### TASK-07 — Cron reset credit

**File:** `app/api/cron/reset-credits/route.ts` (mới)

Auth: header `x-cron-secret: <CRON_SECRET>`.

Logic:
1. Query `users where creditsResetAt <= now`.
2. Batch update: `credits = planCredits`, `creditsResetAt = ngày 1 tháng sau`.

Đăng ký GCP Cloud Scheduler:
```
Schedule: 0 0 1 * *   (00:00 ngày 1 mỗi tháng, Asia/Ho_Chi_Minh)
URL: https://<app-domain>/api/cron/reset-credits
Header: x-cron-secret: <value>
```

---

### TASK-08 — Stripe webhook

**File:** `app/api/webhooks/stripe/route.ts`

Khi event `customer.subscription.updated` hoặc `checkout.session.completed`:
- Xác định `newPlan` từ Stripe price ID.
- Cập nhật `users/{uid}`:
  ```ts
  credits:        PLAN_CREDITS[newPlan],
  planCredits:    PLAN_CREDITS[newPlan],
  creditsResetAt: <ngày 1 tháng sau>,
  ```

---

### TASK-09 — Trang Usage

**File:** `app/(account)/account/usage/page.tsx` (mới)

Sections:
1. **Credit Card**: `credits / planCredits` → progress bar (màu đỏ khi < 20%), ngày reset.
2. **App Limit Card**: `appCount / PLAN_APP_LIMIT[plan]`, link "Nâng cấp" nếu FREE gần đầy.
3. **Lịch sử trừ credit**: table từ `users/{uid}/creditHistory` order by `createdAt desc`, limit 50.
   Columns: Thời gian | Build ID (link) | Kết quả | Thời gian build | Credit trừ | Số dư sau.

Thêm nav item **"Usage"** vào `app/(account)/account/layout.tsx` sidebar.

---

### TASK-10 — Overview page + Apps page

**`app/(account)/account/overview/page.tsx`:**
- Đổi hiển thị `freeBuildsRemaining` → `credits` / `planCredits`.

**`app/(account)/account/apps/page.tsx`:**
- `handleCreate()` gọi `POST /api/apps` (fetch với ID token) thay vì `addDoc()` trực tiếp.
- Hiển thị thông báo lỗi khi vượt giới hạn FREE plan.

---

### TASK-11 — CLI

**`cli/src/api.js`:**
```js
// fetchUserInfo: map response mới
credits:         data.credits         ?? 0,
planCredits:     data.planCredits     ?? 15,
creditsResetAt:  data.creditsResetAt  ?? null,
```

**`cli/src/commands/build.js`:**
```js
// Thay freeBuildsRemaining
infoSpinner.succeed(
  `Plan: ${chalk.cyan(userInfo.plan)}  ·  ` +
  `Credits còn lại: ${chalk.bold(userInfo.credits)}` +
  (userInfo.planCredits === -1 ? '' : `/${userInfo.planCredits}`)
);

// Check quota
if (userInfo.planCredits !== -1 && userInfo.credits <= 0) {
  // báo lỗi, exit
}
```

---

### TASK-12 — Mac server (ant-go-builder)

**Source:** `D:/Projects/ant-go-builder`

Cần thay đổi trong Mac server:
1. Khi nhận job (`status = in_progress`): ghi `startedAt = Date.now()`.
2. Khi build kết thúc (success hoặc failed): **KHÔNG** tự update `status` vào Firestore nữa.
   Thay vào đó, gọi:
   ```
   POST https://<dashboard>/api/builds/{jobId}/complete
   x-internal-secret: <INTERNAL_BUILD_SECRET>
   { "status": "success"|"failed", "durationMs": <ms> }
   ```
3. Server Dashboard sẽ cập nhật Firestore + trừ credit.

**Biến môi trường cần thêm vào Mac server:**
- `DASHBOARD_URL` — URL dashboard (VD: `https://antgo.work`)
- `INTERNAL_BUILD_SECRET` — secret shared với dashboard

---

### TASK-13 — Firestore rules

**File:** `firestore.rules`

```json
match /users/{userId}/creditHistory/{histId} {
  allow read, write: if false;  // chỉ Admin SDK
}
```

---

### TASK-14 — Docs

- [ ] `docs/build-flow.md` — thêm mục credit deduction sau bước 7 (Mac server kết thúc)
- [ ] `app/docs/page.tsx` — cập nhật terminal demo: đổi "Builds còn lại" → "Credits còn lại: X/15"

---

## Tài liệu cần cập nhật sau khi hoàn thành

- [ ] `docs/build-flow.md` — thêm luồng credit deduction, endpoint `/complete`, schema mới
- [ ] `app/docs/page.tsx` — terminal demo build: đổi text quota sang credits

---

## Biến môi trường cần thêm

| Biến | Nơi dùng | Ghi chú |
|---|---|---|
| `INTERNAL_BUILD_SECRET` | Dashboard + Mac server | Bảo vệ endpoint `/api/builds/:id/complete` |
| `CRON_SECRET` | Dashboard + Cloud Scheduler | Bảo vệ endpoint `/api/cron/reset-credits` |

Thêm vào `env.yaml` (Dashboard) và Secret Manager, grant quyền cho App Engine SA.

---

## Rủi ro & lưu ý

| Vấn đề | Xử lý |
|---|---|
| Mac server hiện đang ghi Firestore trực tiếp | TASK-12 phải làm **sau** TASK-03 đã deploy lên production — tránh khoảng thời gian Mac server gọi endpoint chưa tồn tại |
| `POST /api/apps/route.ts` cùng folder với `[id]/` | Next.js cho phép — nhưng phải chạy `next build` verify sau khi tạo |
| Race condition khi trừ credit | `deductCredit()` dùng Firestore **transaction** |
| Cron chạy nhiều lần (at-least-once) | Transaction trong reset cũng check `creditsResetAt > now` để idempotent |

