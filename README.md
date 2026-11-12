# zebastore

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

The compose credentials are local development values only. The seed inserts starter SKUs at zero physical stock when the catalog is empty, and leaves an existing catalog unchanged. Admin must review the catalogue and enter real stock before opening orders. No delivery zone is silently enabled.

Set `DEMO_MODE=false` to use the real database-backed workflow. Keep `ACCEPT_ORDERS=false` during configuration; enable it explicitly for controlled verification and reviewed launch. `/api/health` reports operational readiness without exposing credentials. `/admin` redirects to the authenticated merchant workspace in live mode.

The first live workflow includes:

- Persistent COD and Razorpay orders with server-authoritative prices, GST-inclusive integer-paise totals and zone-specific delivery fees.
- Transactional stock reservation, delivery-slot capacity/cut-off checks, cross-replica idempotency and rejection of changed payloads under the same key.
- Guest checkout and private, expiring receipt tokens; receipt APIs do not expose customer phone/address. Optional Twilio Verify customer accounts add verified phone login, saved names/addresses and private purchase history; confirm unverified guest orders before fulfilment.
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
npm run test:e2e:customer
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

Vercel configuration is included. Its build command migrates the database, seeds an empty catalog, then runs `npm run build`. Seeding skips once any product exists and does not enable sample stock. Production runtime settings are server-only. Configure managed PostgreSQL/Redis before enabling actual orders. The Dockerfile uses Next's standalone output and a non-root runtime user. Do not use local compose passwords in production.

HTML reads the server's current mode at request time; no production database call is needed to render the initial shell. Static assets are CDN-friendly and public catalogue data has a short shared cache. Admin and private receipts are always dynamic and uncached. Set a bounded connection pool (`DATABASE_POOL_MAX`, default 2 on Vercel), use the managed provider's pooler, and account for total connections across replicas.

`scripts/load-test.js` supplies a catalogue-only staging scenario ramping to 10,000 virtual clients with think time. It has **not** demonstrated full-system 10,000-client capacity. Authenticated checkout/stock/credit/webhook traffic needs separate load scenarios and measured infrastructure sizing. Do not load-test a real payment provider by generating live charges.

## Remaining scope

This first live workflow is not the complete four-phase wholesale platform: multi-role staff, full product/variant CRUD, retailer KYC/custom pricing/credit, wallets, standing orders, notifications, driver assignment, tax-invoice PDFs and automated returns still need implementation/integration. Hindi content is partial and an accessibility audit remains necessary. Merchant identity, policies, real stock/tax values, live gateway activation, backups, monitoring and staging verification remain launch prerequisites.

## Recovering local development

Stop the running dev server before starting another process for the same checkout. Production output uses `.next`; development uses `.next-dev` so a production build cannot overwrite development chunks. Offline caching is disabled in development.

If a stale client bundle fails before React starts:

```sh
git pull origin main
npm run dev:clean
```

Open `/reset.html` on the exact localhost address/port that failed, wait for the cleanup confirmation, then choose **Return to the store**. This standalone page works without React, removes only this app's service workers/offline caches and keeps your cart/favourites. If needed, unregister the old service worker in browser developer tools → Application → Service Workers. Copy commands without the terminal prompt or commas.

## Photos and operating guides

The optimized WebP photos and their licences are listed on the public [/credits](/credits) page (`app/credits/page.tsx` and `lib/photo-credits.ts`). They illustrate the food, not a guaranteed branded packet. Once products exist, seeding does not change their photos, names, prices or stock. The catalogue keeps the existing `/products/<file>.webp` paths.

[docs/OPERATIONS_GUIDE.md](docs/OPERATIONS_GUIDE.md) describes the demo workflow at the photo-update commit. Use [LIVE_LAUNCH.md](LIVE_LAUNCH.md) for the current database-backed workflow and Vercel setup.

## Diagnose a local store that cannot refresh

Run `npm run doctor` from the project folder. It reads the same environment files as Next development (including `.env.local`) and reports only setting-presence flags and sanitized configuration/PostgreSQL/Redis check codes, never credential values. A failing check exits with code 1. `/api/health` now also reports separate service checks in live mode. Keep checkout paused until all checks pass; do not disable TLS verification to resolve a connection failure.

- `MISSING_SETTINGS` / `NOT_CONFIGURED`: enter the missing settings in your private local environment file.
- `INVALID_URL_PROTOCOL` for Redis: use a `redis://` or `rediss://` connection URL, not an HTTPS REST endpoint.
- `ECONNREFUSED`: the selected local service/port is not accepting connections; use your running local service or the correct hosted connection.
- `28P01` / `AUTHENTICATION_FAILED`: verify credentials securely with the provider.
- `ENOTFOUND`: verify the connection hostname and network access.

Restart `npm run dev` after changing local settings. A failed store refresh never means the order is free: unavailable totals are shown explicitly and submission remains disabled. Saved cart items are retained for customer review rather than silently removed when a product is missing from a refreshed catalogue.

### Customer accounts and SMS OTP

The quantity popup lets customers select packs, then choose **OK, go to cart**.
Customer accounts save verified phone numbers, names and delivery addresses in PostgreSQL.
Returning customers sign in with phone + OTP and can see their own purchases on any device.
Sessions last 30 days and use an HttpOnly cookie; signing out revokes the server session.
New customers save their name and first address after verification. They can add, edit,
remove and choose saved addresses. Orders keep their original address snapshot.

Recommended SMS provider: [Twilio Verify](https://www.twilio.com/docs/verify).
Create a Twilio account and Verify service, fund the account, and enable SMS to India
in Verify geographic permissions. Keep the Verify service code length at six digits. Confirm India delivery/registration requirements and
pricing with Twilio for your account; trial accounts restrict recipient numbers.
Set these **server-side** variables in Vercel Environment Variables and your PC's `.env.local`:

```dotenv
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your Account SID>
TWILIO_AUTH_TOKEN=<your Auth Token>
TWILIO_VERIFY_SERVICE_SID=<your Verify Service SID>
CUSTOMER_ACCOUNTS_ENABLED=true
```

Never put these values in `NEXT_PUBLIC_*`, Git, screenshots or chat. Use the same PostgreSQL,
Redis and `SESSION_SECRET` across replicas. Apply `npm run db:migrate` before running locally
(the migration command reads `.env`, so provide DATABASE_URL there or in your shell).
Vercel already runs migrations during builds. Redeploy Vercel or restart your PC server
after changing variables. Set APP_ORIGIN to the exact URL used in each environment.

Keep `CUSTOMER_ACCOUNTS_ENABLED=false` until SMS is configured and tested; the store will
continue its existing guest checkout. Enabling the flag requires verified login and a
saved address for checkout. Missing provider configuration fails closed, never accepts
made-up OTPs, and does not silently create unverified accounts. OTPs expire after five
minutes, allow at most five attempts and have resend/rate limits enforced by shared Redis.
Real SMS delivery and charges require testing with your own provider account; automated
tests mock provider responses and send no SMS.

Only orders placed while signed in appear automatically in purchase history. A previous
guest order on the same browser may be linked after login only when its private receipt
is valid and its phone matches the verified customer. Other old guest orders are not
exposed by searching a phone number. Existing orders, stock and carts are not deleted
by the account migration. Browser carts remain on that browser; addresses and purchase
history belong to the account. Customer APIs are never cached publicly.

Before enabling accounts for customers, verify: real OTP arrival and incorrect/expired
code rejection, first-time profile save, sign out then sign back in, a COD order in history,
a second phone seeing only its own orders, and saved-address checkout. Test Razorpay
separately with the appropriate test/live keys.

The account browser suite requires `CUSTOMER_TEST_BASE_URL` pointing to an isolated localhost
server with accounts enabled and `DATABASE_URL` pointing to its migrated test database
(name must contain `test`). It mocks only SMS delivery, uses real database sessions and
profile/order APIs, and places then cancels test COD orders. It sends no real SMS.
