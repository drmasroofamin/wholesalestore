# Grain & Good

A mobile-first grain-store app with a responsive storefront, guest checkout, protected merchant workspace, PostgreSQL persistence and Razorpay integration. Next.js 15 App Router, React 19, TypeScript, Prisma's JavaScript query compiler, PostgreSQL and Redis.

**For Vercel setup and actual-order verification, read [LIVE_LAUNCH.md](LIVE_LAUNCH.md).** The default is still a safe demonstration. This repository is not evidence that a public deployment, merchant account or live payment has been verified.

## Local demo

Use Node.js 24 and the existing checkout. Cloud tasks already have isolated workspaces; do not create a Git worktree unless explicitly requested.

```sh
npm ci
npm run db:generate
npm run dev
```

Storefront: `/`. Admin demo: `/admin`. Policies: `/policies`. The demo needs no external credentials and does not save server-side orders or collect payments.

## Database-backed operation

Copy `.env.example` to your private `.env` only if the file does not exist; otherwise edit the existing file. Configure the database/Redis, merchant details, admin password hash and signing secrets. Never commit credentials.

```sh
docker compose up -d db redis
npm run db:migrate
npm run db:seed
npm run admin:password
```

The compose credentials are local development values only. The seed preserves existing prices/stock and creates new starter SKUs with zero physical stock. Admin must review the catalogue and enter real stock before opening orders. No delivery zone is silently enabled.

Set `DEMO_MODE=false` to use the real database-backed workflow. Keep `ACCEPT_ORDERS=false` during configuration; enable it explicitly for controlled verification and reviewed launch. `/api/health` reports operational readiness without exposing credentials. `/admin` redirects to the authenticated merchant workspace in live mode.

The first live workflow includes:

- Persistent COD and Razorpay orders with server-authoritative prices, GST-inclusive integer-paise totals and zone-specific delivery fees.
- Transactional stock reservation, delivery-slot capacity/cut-off checks, cross-replica idempotency and rejection of changed payloads under the same key.
- Guest checkout and private, expiring receipt tokens; receipt APIs do not expose customer phone/address. Phone numbers are not yet OTP-verified; confirm guest orders before fulfilment.
- Password-hash-based merchant sign-in, signed HttpOnly SameSite cookies, rate limiting, protected order/inventory/zone endpoints and audit records.
- Persistent admin status changes, explicit COD collection confirmation, cancellation/expiry release, stock editing and delivery-zone/slot controls.
- Server-created Razorpay orders, signed browser verification, amount/currency checks, idempotent signed webhooks and monotonic captured/failed/refunded state handling.
- Test-mode payments labelled and blocked from fulfilment. Late capture after cancellation flagged for merchant refund review. Refunds are initiated in the Razorpay dashboard and reconciled by signed webhooks.
- 15-minute unpaid online reservations, an authenticated expiry endpoint and a throttled catalogue-traffic fallback sweep.
- Local product photos/fonts, separately loaded admin routes, bounded PostgreSQL pools and a public catalogue cache of 15 seconds. Private/admin/payment APIs are not cached by the offline worker.

## Commands

```sh
npm test
npm run test:live
npm run db:validate
npm run build
npm run typecheck
npm start
```

`test:live` requires a dedicated `TEST_DATABASE_URL` whose database name contains `test`, initialized with `db:migrate`, plus Redis. It deliberately clears test tables and refuses a database without `test` in its name. Never point integration tests at customer data.

Browser tests need a running server and Chromium:

```sh
npm run test:e2e
npm run test:e2e:live
```

Demo browser tests use `TEST_BASE_URL` (default local port 3000). The live browser suite needs `LIVE_TEST_BASE_URL` and `TEST_ADMIN_PASSWORD_FILE` for an isolated verification deployment. It places and then cancels verification COD orders. Remote execution requires explicit `ALLOW_STAGING_E2E=true`; do not run it on a customer production store. Set `CHROMIUM_PATH` when your installed Chromium differs from `/usr/bin/chromium`.

CI runs migration, unit/database tests, live PostgreSQL/Redis integration tests, production build and type checks. Client generation uses the pinned Prisma internals WASM parser and JS query compiler; it does not disable signature/checksum verification. SQL migrations use `pg`, an advisory lock and a checksum ledger (`_GrainMigration`), so native migration-engine downloads are not needed. Do not mix migration ledgers or edit applied SQL files.

## Structure

```text
app/                        Storefront, policies, protected admin and API routes
components/                 Storefront, demo admin, login and live merchant UI
lib/live-orders.ts          Transactional order/reservation/status services
lib/live-payments.ts        Gateway order association and payment/refund reconciliation
lib/admin-auth.ts           Password verification, signed sessions and receipt tokens
lib/live-catalog.ts         Public database-backed catalogue
lib/security.ts             HMAC, origin checks and namespaced Redis rate limits
lib/payments.ts             Swappable Razorpay HTTP adapter
prisma/                     29-model schema, reviewed SQL migrations and safe seed
scripts/                    Migrations, password setup, client generation and load scenario
tests/                      Unit/API/schema tests and demo browser coverage
tests/live/                 Actual PostgreSQL/Redis integration coverage
tests/live-browser/         Customer-to-admin saved COD order verification
public/                     Local licensed product photos, icons, recovery page and offline worker
```

## API overview

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/store` | Public live config, catalogue, active zones and available slots |
| `GET /api/catalog` | Public catalogue, briefly CDN-cacheable |
| `GET /api/health` | Readiness and whether new orders are enabled |
| `POST /api/orders` | Demo receipt or persistent live checkout, depending on server mode |
| `GET /api/orders/:id` | Private customer status/receipt; signed Bearer receipt token required |
| `POST /api/payments/verify` | Signed gateway verification tied to the private receipt and expected amount |
| `POST /api/payments/webhook` | Raw-body HMAC-verified captured, failed and refund reconciliation |
| `POST /api/admin/login`, `/logout` | Merchant session creation/removal |
| `GET /api/admin/orders` | Protected paginated/searchable saved orders |
| `PATCH /api/admin/orders/:id` | Protected, audited status transitions/COD collection |
| `GET/PATCH /api/admin/catalog` | Protected stock and price management |
| `GET/POST /api/admin/zones` | Protected explicit pincode/fee rules |
| `POST /api/admin/slots` | Protected upcoming slot generation |
| `GET /api/internal/expire` | Scheduler-only reservation expiry; secret Authorization header required |

Live checkout body: `{items:[{id,quantity}],name,phone,address,pincode,slot,payment,coupon,expectedTotal}`. `Idempotency-Key` must be a UUID. `slot` is an actual available slot ID from `/api/store`, not a free-form date label. `expectedTotal` must match the server-authoritative total. Keep the same key/payload for network retries. A changed cart/contact/slot requires a new key; cancelled reservations cannot be reused. The storefront handles this automatically.

## Deployment and capacity

Vercel configuration is included; run `npm run build`. Production runtime settings are server-only. Configure managed PostgreSQL/Redis and run reviewed migrations before enabling actual orders. The Dockerfile uses Next's standalone output and a non-root runtime user. Do not use local compose passwords in production.

HTML reads the server's current mode at request time; no production database call is needed to render the initial shell. Static assets are CDN-friendly and public catalogue data has a short shared cache. Admin and private receipts are always dynamic and uncached. Set a bounded connection pool (`DATABASE_POOL_MAX`, default 2 on Vercel), use the managed provider's pooler, and account for total connections across replicas.

`scripts/load-test.js` supplies a catalogue-only staging scenario ramping to 10,000 virtual clients with think time. It has **not** demonstrated full-system 10,000-client capacity. Authenticated checkout/stock/credit/webhook traffic needs separate load scenarios and measured infrastructure sizing. Do not load-test a real payment provider by generating live charges.

## Remaining scope

This first live workflow is not the complete four-phase wholesale platform: OTP customer accounts, multi-role staff, full product/variant CRUD, retailer KYC/custom pricing/credit, wallets, standing orders, notifications, driver assignment, tax-invoice PDFs and automated returns still need implementation/integration. Hindi content is partial and an accessibility audit remains necessary. Merchant identity, policies, real stock/tax values, live gateway activation, backups, monitoring and staging verification remain launch prerequisites.

## Recovering local development

Stop the running dev server before starting another process for the same checkout. Production output uses `.next`; development uses `.next-dev` so a production build cannot overwrite development chunks. Offline caching is disabled in development.

If a stale client bundle fails before React starts:

```sh
git pull origin main
npm run dev:clean
```

Open `/reset.html` on the exact localhost address/port that failed, wait for the cleanup confirmation, then choose **Return to the store**. This standalone page works without React, removes only this app's service workers/offline caches and keeps your cart/favourites. If needed, unregister the old service worker in browser developer tools → Application → Service Workers. Copy commands without the terminal prompt or commas.

## Photos and operating guides

The optimized WebP photos and their licences are preserved in [public/products/CREDITS.md](public/products/CREDITS.md). They illustrate the food, not a guaranteed branded packet. The seed refreshes existing product photos/names without overwriting their prices or stock.

[docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md) describes the demo workflow at the photo-update commit. Use [LIVE_LAUNCH.md](LIVE_LAUNCH.md) for the current database-backed workflow and Vercel setup.
