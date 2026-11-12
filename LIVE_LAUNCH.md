# Launch and verify actual orders on Vercel

The repository now has a persistent guest-order workflow, protected merchant admin and Razorpay integration. **This document does not mean a deployment or a live payment has been verified.** You must connect your own database, Redis, merchant account and domain before taking customer orders.

Copy only commands inside code blocks. Do not copy terminal prompts or add commas. Run commands one line at a time.

## 1. Update the project locally

```sh
git pull origin main
npm ci
npm run db:generate
```

Node.js 24 is supported. Stop older development servers before starting another one for the same checkout.

## 2. Create the hosted services

- In Vercel, import `drmasroofamin/wholesalestore` as a Next.js project. Use Node.js 24 and the repository root. `vercel.json` builds with `npm run db:migrate && npm run db:seed && npm run build`, using the project’s environment variables (no `.env` file on Vercel). The committed Vercel configuration selects Mumbai (`bom1`).
- Create a managed PostgreSQL database, for example Neon through Vercel Marketplace. Keep its pooled connection URL for the app and its direct connection URL for migrations. Use the provider's verified TLS configuration.
- Create a managed Redis instance, for example Upstash. This implementation uses a Redis TCP/TLS URL (`rediss://...`), **not** the Upstash REST URL. Use separate databases/Redis instances for staging and production.
- Keep the initial deployment paused. `ACCEPT_ORDERS=false` prevents customer orders while you configure and review the store.

These actions happen in your provider accounts. Never paste connection URLs, passwords, API secrets or webhook secrets into chat or GitHub.

## 3. Configure server-only environment variables

Add these under Vercel → Project → Settings → Environment Variables. Configure production and staging separately. Changing Vercel environment settings normally requires a redeployment.

| Name | Value / purpose |
| --- | --- |
| `DEMO_MODE` | `false` to use the real database workflow |
| `ACCEPT_ORDERS` | Initially `false`; enable only for controlled verification or reviewed launch |
| `APP_ORIGIN` | Exact HTTPS store origin, such as your assigned `https://...vercel.app` URL; no trailing path |
| `STORE_NAME` | Your actual public business name |
| `STORE_PHONE` | Actual customer-support phone number. The public site renders this value and does not substitute a sample number. |
| `STORE_EMAIL` | Optional public email. The contact page and footer show it only when it is set. |
| `STORE_ADDRESS` | Optional public address. A line is shown only when it is set. |
| `STORE_DISTRICT` | `Anantnag district` |
| `CANCELLATION_POLICY` | Your reviewed cancellation terms; a contact-before-packing default exists |
| `REFUND_POLICY` | Your reviewed eligibility, reporting and processing terms |
| `DATABASE_URL` | Managed pooled PostgreSQL URL |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL URL for CLI migrations (optional when pooled URL supports them) |
| `DATABASE_POOL_MAX` | Start with `2` per Node process; size against your provider's total connection budget |
| `REDIS_URL` | Managed `rediss://` connection URL |
| `ADMIN_PASSWORD_HASH` | Output of the hidden-input password command below |
| `SESSION_SECRET` | At least 32 random characters; signs admin sessions and private receipt tokens |
| `CRON_SECRET` | A different random secret for the reservation-expiry endpoint |
| `RAZORPAY_KEY_ID` | Test ID during verification, live ID only after Razorpay activation |
| `RAZORPAY_KEY_SECRET` | Matching server-only Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Independent secret shared with your Razorpay webhook configuration |

Generate the admin password hash on your own computer:

```sh
npm run admin:password
```

Choose a password of at least 12 characters. Input is hidden. Keep the password for signing in; enter the generated hash into hosting settings. There is no default admin password.

Generate a session secret locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Run that command again to generate a **different** cron secret. Store them securely; do not paste their output into chat. Rotating the password hash invalidates admin sessions. Rotating `SESSION_SECRET` invalidates both sessions and existing private receipt links.

## 4. Initialize the hosted database

Create or edit your local ignored `.env` file, using `.env.example` as a template. Enter your database/Redis values securely in your editor. If the file already exists, preserve its other settings. `.env` is ignored by Git; do not commit it.

The following commands connect to the database configured in that private file:

```sh
npm run db:migrate
npm run db:seed
```

Migrations use the direct URL when provided, apply under an advisory lock, and record checksums. Do not modify an applied SQL migration. There is no native Prisma engine download requirement for these commands.

The seed adds eight starter grain SKUs **at zero stock** when no products exist, then skips later runs so prices and inventory stay as they are. It does not set `SEED_SAMPLE_STOCK`. Prices, descriptions, tax rates, HSN codes and stock are starter data, not verified merchant inventory. Review them before opening orders. Set actual stock in admin. `SEED_SAMPLE_STOCK=true` is for isolated local tests only.

## 5. Configure your delivery area and inventory

After redeploying with the environment variables:

1. Open `/api/health`. A configured store reports `mode: live` and `ready: true`. It may remain paused.
2. Open `/admin`. It redirects to the protected merchant workspace and asks you to sign in using your chosen password.
3. Open **Delivery zones**. Add only pincodes you actually deliver to, with fee, free-delivery threshold and COD limit. `192210` can be added if it is in your service area. Do not assume every valid postal code belongs to Anantnag district.
4. Generate delivery slots for the next seven days using a capacity your delivery team can fulfil. Slot times use Asia/Kolkata; the default cut-off is one hour before the start. Generate new slots regularly; existing capacities are preserved.
5. In **Inventory**, verify the prices/MRP and enter actual physical stock. Reserved stock cannot be removed below existing orders. The first release sells each starter product's default pack; it does not yet offer arbitrary multi-variant or B2B credit checkout.
6. Review `/policies`, support details, applicable business licences and tax configuration against the actual merchant's obligations. The downloadable receipt is not a GST tax-invoice PDF.

No new order is accepted for an inactive/missing zone, past/full slot, insufficient stock or incorrect displayed total.

## 6. Verify cash on delivery

Use a staging deployment/database first, or a controlled private verification window. Set `ACCEPT_ORDERS=true` and redeploy for this test.

1. Add an in-stock product, enter your own contact/address and approved pincode, choose a real future slot and select COD.
2. Place the order. It should display a persistent `GG-...` order number and `COD_PENDING` payment status.
3. In a separate admin tab, find the order by reference or phone. Verify the address, pack, quantities, total and delivery slot.
4. Reload the browser. The order must still be present in admin, and the customer's private receipt should still show its status.
5. Move it to `CONFIRMED`. The customer tracking screen checks the saved status every 15 seconds.
6. Cancel the verification order **before packing**. Confirm the reserved stock and delivery-slot booking are released. Do not dispatch verification orders.

Real COD orders require merchant confirmation of the contact/address before fulfilment. Customer phone numbers are validated for format but are **not OTP-verified** in this release. The merchant must explicitly confirm full cash collection before marking a COD order delivered.

## 7. Connect and verify Razorpay

The code cannot activate your merchant account or generate keys for you.

1. In Razorpay test mode, create a key ID/secret pair. Enter them in your staging environment settings.
2. Configure a webhook pointing to `https://YOUR-STORE/api/payments/webhook` with the same independent `RAZORPAY_WEBHOOK_SECRET` you saved in hosting settings.
3. Enable `payment.captured`, `payment.failed`, and `refund.processed` events. Configure automatic payment capture in Razorpay; the app does not fulfil an order on `authorized` status alone.
4. Place a test online order using Razorpay's current official sandbox payment instructions. The app creates the gateway order on the server. The popup, server signature verification and signed webhook should identify the same order/INR amount.
5. Confirm the internal order appears in admin, payment transitions to `PAID`, and a duplicate webhook does not create a second payment or order. Test-payment orders are labelled `RAZORPAY_TEST` and are blocked from normal fulfilment.
6. Test a failed/dismissed payment. Retry must reuse the existing reservation and gateway order. After expiry, stock and slot capacity must be released. A new attempt after cancellation/expiry needs a new checkout key.
7. Test a refund from the Razorpay dashboard and confirm the signed refund webhook updates the internal payment/refund record. Full refunds before packing cancel the order and release its reservation.

For production, complete Razorpay KYC/activation, replace **both** API keys with a matching live pair, configure the live-mode webhook and redeploy. Never mix test and live keys or webhook secrets. UPI/cards/netbanking availability is also controlled by the activated Razorpay account. Make a small controlled real payment and refund, confirm it in both dashboards, and verify settlement expectations before advertising the site.

Refunds currently originate from the authenticated Razorpay dashboard. A payment captured after an order was cancelled/expired is saved as paid on a cancelled order, flagged **Refund required**, and must be reconciled/refunded by the merchant. Do not fulfil it or tell the customer to pay again. Partial refunds are recorded, but automated returns and self-service refund workflows are not part of this first live release.

## 8. Schedule reservation expiry

Online reservations last 15 minutes. Use a scheduler that can call:

`GET /api/internal/expire`

with `Authorization: Bearer <CRON_SECRET>` as a private HTTP header. Do not put the secret in a URL. Schedule it every 1–5 minutes. Vercel cron availability/frequency depends on your plan; a five-minute schedule may require a paid plan. No paid cron has been enabled automatically by this repository.

Public catalogue traffic also triggers a throttled expiry sweep across replicas, but this is a fallback, not a substitute for a configured scheduler. When there are no visitors, only the scheduler ensures timely release. Generate upcoming delivery slots regularly in admin.

## 9. Open real ordering

Keep `ACCEPT_ORDERS=false` until the database persistence, admin access, delivery zones, physical stock, policies, COD flow, live payment/refund and expiry scheduler checks above pass. Then set it to `true` for the customer-facing deployment and redeploy. Configure a custom domain/HTTPS and update `APP_ORIGIN` to that canonical origin. Monitor orders and Razorpay reconciliation from the first transaction.

To pause new orders, set `ACCEPT_ORDERS=false` and redeploy; existing receipts, admin operations and payment webhooks remain available for reconciliation.

## Verification performed in the development workspace

PostgreSQL 17 and Redis 7 are used for local integration tests. The automated suite checks persistence, concurrent duplicate requests, last-stock races, slot/zone/price rejection, cancellation and COD delivery, signed-session rules, capture/refund event replay, expiry and late-capture review. Gateway HTTP calls are mocked in those tests; this is not evidence of an activated Razorpay account or a live provider transaction.

A browser suite separately verifies a saved COD order from customer checkout through protected admin status updates and receipt polling. These tests run against isolated local databases; no real customer is contacted and no goods are dispatched. The Vercel deployment and its managed services must be verified separately.

10,000-client capacity is a target, not a verified guarantee. Use a CDN for static assets and the briefly cached public catalogue, managed pooled PostgreSQL, shared Redis, a bounded per-process connection pool and staging load tests before making that claim.
