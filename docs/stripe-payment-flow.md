# Stripe Payment Flow

Luồng thanh toán từ homepage → Stripe Checkout → webhook cập nhật Firestore → billing page.

---

## Tổng quan

```
Homepage / Billing page          API Routes                    Stripe            Firestore
        │                             │                           │                   │
        ├── Click "Nâng cấp"          │                           │                   │
        ├── POST /api/billing/checkout►│ verifyIdToken             │                   │
        │                             ├── get/create customer ────►│                   │
        │                             ├── checkout.sessions.create►│                   │
        │◄── { url } ─────────────────┤                           │                   │
        ├── redirect → stripe.com ────────────────────────────────►│                   │
        │                             │          user pays         │                   │
        │◄── redirect to /account/billing?success=1               │                   │
        │                             │          webhook ──────────┼──► POST /webhooks/stripe
        │                             │                            │    update users/{uid}
        │◄── onSnapshot: plan updated ◄──────────────────────────────────────────────┘
```

---

## Các files liên quan

| File | Vai trò |
|---|---|
| `lib/stripe.ts` | Stripe client singleton |
| `app/api/billing/checkout/route.ts` | `POST /api/billing/checkout` — tạo Checkout session |
| `app/api/billing/portal/route.ts` | `POST /api/billing/portal` — mở Customer Portal |
| `app/api/webhooks/stripe/route.ts` | `POST /api/webhooks/stripe` — xử lý webhook events |
| `app/(account)/account/billing/page.tsx` | UI trang Billing |
| `app/page.tsx` | Homepage — pricing CTA buttons |

---

## Environment variables

### `.env.local` (development)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
```

### `.env.production`
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
```

---

## Flow chi tiết

### Bước 1 — User click CTA trên homepage hoặc billing page

- **Nếu chưa đăng nhập** → redirect đến `/login`.
- **Nếu plan = "team"** → mở `mailto:support@antgo.work`.
- **Nếu đã đăng nhập** → gọi `POST /api/billing/checkout` với Firebase ID token.

---

### Bước 2 — Tạo Stripe Checkout session

**`POST /api/billing/checkout`**
1. Xác thực Firebase ID token.
2. Đọc `users/{uid}` để lấy `stripeCustomerId`.
3. **Nếu chưa có customer** → tạo `stripe.customers.create()` với email và `metadata.firebaseUid`, lưu `stripeCustomerId` vào Firestore.
4. Tạo `stripe.checkout.sessions.create()`:
   - `mode: "subscription"`
   - `line_items`: price ID theo plan
   - `success_url`: `/account/billing?success=1`
   - `cancel_url`: `/account/billing?canceled=1`
   - `metadata`: `{ firebaseUid, plan }`
   - `subscription_data.metadata`: `{ firebaseUid, plan }` — quan trọng cho webhook
5. Trả về `{ url }` → client redirect đến Stripe Checkout.

---

### Bước 3 — User thanh toán trên Stripe

Stripe hosted checkout page xử lý toàn bộ thanh toán (card, Apple Pay, v.v.).

---

### Bước 4 — Webhook cập nhật Firestore

**`POST /api/webhooks/stripe`** — phải được đăng ký trong Stripe Dashboard.

Stripe gửi HMAC-signed request. Server verify với `STRIPE_WEBHOOK_SECRET` trước khi xử lý.

| Event | Hành động |
|---|---|
| `checkout.session.completed` | Set `plan`, `planStatus=active`, `stripeSubscriptionId` |
| `customer.subscription.updated` | Cập nhật `plan` và `planStatus` theo trạng thái sub |
| `customer.subscription.deleted` | Reset về `plan=free`, `planStatus=canceled` |
| `invoice.payment_failed` | Set `planStatus=past_due` |

Firestore `users/{uid}` sau khi subscribe:
```
plan:                 "starter" | "pro" | "team"
planStatus:           "active" | "past_due" | "canceled"
stripeCustomerId:     "cus_..."
stripeSubscriptionId: "sub_..."
```

---

### Bước 5 — Customer Portal (quản lý billing)

**`POST /api/billing/portal`**
1. Xác thực Firebase ID token.
2. Đọc `stripeCustomerId` từ Firestore.
3. Tạo `stripe.billingPortal.sessions.create()` với `return_url: /account/billing`.
4. Trả về `{ url }` → client redirect.

Qua portal, user có thể: đổi plan, huỷ subscription, cập nhật thẻ.

---

## Firestore data model

```
users/{uid}
  plan:                 "free" | "starter" | "pro" | "team"
  planStatus:           "active" | "past_due" | "canceled" | null
  stripeCustomerId:     "cus_..."   | null
  stripeSubscriptionId: "sub_..."   | null
```

---

## Setup Stripe Webhook

1. Vào Stripe Dashboard → Webhooks → Add endpoint.
2. URL: `https://antgo.work/api/webhooks/stripe`
3. Events cần lắng nghe:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy **Signing secret** → set `STRIPE_WEBHOOK_SECRET` trong env.

### Test webhook locally

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Billing page UI

Trang `/account/billing` hiển thị:

- **Current plan card**: tên plan, trạng thái (Active / Past Due / Canceled), nút "Quản lý billing" nếu có subscription.
- **Plan grid**: 3 cards (Starter / Pro / Team) với nút tương ứng:
  - `Gói hiện tại` → disabled (plan đang dùng)
  - `Hạ xuống` → mở Customer Portal (plan thấp hơn)
  - `Nâng cấp` → gọi checkout (plan cao hơn)
- **Flash messages**: banner xanh khi `?success=1`, banner xám khi `?canceled=1`.
