# Grain & Good

Mobile-first grain and grocery storefront with a responsive merchant workspace. Built with Next.js App Router, React, TypeScript, locally hosted fonts and illustrations, and a PostgreSQL/Prisma data foundation.

**Current release is a working demonstration, not a production commerce launch.** No money is collected, no delivery is scheduled, and admin changes affect sample data only. Do not enter real KYC or sensitive customer information.

## Run

Requires Node.js 24 and npm 11. Use the existing checkout; a task already has an isolated workspace and does not need a new Git worktree.

```sh
cd /workspace/wholesalestore
npm ci
npm run db:generate
npm run dev
```

Storefront: `/`. Merchant demonstration: `/admin`. Policies: `/policies`.

The demo needs no credentials, database or Redis process. Copy `.env.example` to `.env` only if you need to configure optional infrastructure. Never commit credentials.

For a production build, run `npm run build` and `npm start`. Docker uses the standalone Next.js server and a non-root runtime user.

## What works

- Responsive storefront, local product illustrations, locally hosted fonts, English/Hindi product search, category and pack filters, sorting, product detail dialogs.
- Favourites and cart persisted on the device; quantities bounded by sample stock; free-delivery threshold, coupon calculation, GST-inclusive totals.
- One-page validated COD **demo** checkout. Trusted server catalogue determines prices. Duplicate checkout keys produce the same demo receipt ID; there are no persistent side effects.
- Latest demo receipt survives reload; downloadable text receipt is explicitly not a tax invoice.
- Retailer demo registration saved on the device, without granting wholesale or credit approval.
- Admin sample dashboard, charts, searchable/filterable orders, bulk confirmation, status changes, editable sample price/stock, retailer approval, delivery statuses, payment reconciliation views and CSV exports. All admin changes are session-only.
- Offline cached storefront/assets after service-worker activation and a subsequent online visit. API requests, admin data and payment paths are never cached. Offline checkout is not supported.
- Install manifest with 192px/512px icons, secure response headers, request validation, origin checks and bounded item quantities.
- Pricing tiers, integer-paise GST split, credit eligibility and payment-signature rules with tests.
- Swappable server-side payment interface and Razorpay HTTP adapter with timeout, signature, amount, currency and captured-status validation. HTTP routes deliberately refuse live payment operations until durable reconciliation is implemented.
- Validated 29-model Prisma schema, initial PostgreSQL SQL migration, idempotent product seed, indexes and stock/money constraints.

## Scope still required before live launch

| Area | Remaining work |
| --- | --- |
| Authentication | Provider-backed OTP, OTP rate limits, expiring sessions/refresh tokens, logout/revocation, RBAC and authorization of every live endpoint |
| Orders | Connect database-backed carts/orders, transactional stock reservation/release, authoritative slot capacity, price recalculation and reservation expiry worker |
| Payments | Connect Razorpay order creation to durable internal orders, launch hosted checkout, reconcile signed webhook events transactionally with unique event IDs, retries, settlement/refund workers |
| Admin | Replace public sample workspace with authenticated, audited APIs and persistent CRUD; implement real customer, KYC and staff controls |
| B2B | Persist approvals, verified GST/PAN, per-retailer prices, enforce credit/overdue rules atomically, quick/CSV orders, standing orders |
| Fulfilment | Delivery partner authorization, assignment, real status updates, COD reconciliation and capacity rules |
| Documents | Verified business identifiers, GST invoice/challan PDF generation, storage and signed document URLs |
| Remaining services | Wallet ledger/refunds, notifications, reviews, recurring orders, live reports, returns and uploads |
| Language/accessibility | Hindi content is partial; full translation dictionaries and an accessibility audit are still required |
| Legal | Replace policy drafts and sample support number with verified merchant details, FSSAI/GST information and actual refund/service terms |

Setting `DEMO_MODE=false` **fails closed** with HTTP 503. Adding gateway keys alone does not enable live commerce. The application does not claim complete implementation of the uploaded four-phase specification.

## Structure

```text
app/                   Next.js routes, API handlers, admin and policies
components/            Interactive storefront
lib/catalog.ts         Typed sample catalogue, INR formatting
lib/rules.ts           Pure pricing, tax, credit and quote rules
lib/payments.ts        Provider boundary and Razorpay adapter
lib/security.ts        HMAC verification, origin check, Redis rate-limit utility
lib/db.ts              Singleton Prisma client + capped PostgreSQL pool
prisma/                29-model schema, initial migration, safe upsert seed
public/                Local illustrations, font-independent icons, PWA worker
scripts/               Client generation, schema checks and staging load scenario
tests/                 Unit/API tests, SQL migration smoke test, browser tests
```

## Database and infrastructure

```sh
docker compose up -d db redis
npm run db:generate
npm run db:migrate
npm run db:seed
```

The compose database password is for local development only. Production must use managed credentials, TLS, backups, restore testing and private database/Redis access. `db:push` is available for disposable development databases; use reviewed migrations for real data.

Client generation uses Prisma 6.19's packaged WASM parser and JavaScript query compiler with `@prisma/adapter-pg`, avoiding native query-engine downloads. `@prisma/internals` is pinned because its generator API is internal. Upgrade it together with Prisma and rerun all checks. Standard `prisma generate` is an alternative on networks that allow Prisma's engine distribution domain.

The native Prisma migration CLI may require `binaries.prisma.sh`. This cloud environment currently blocks that domain. Keep checksum/TLS verification enabled; add the hostname to approved environment network settings for native migration commands. The SQL migration is tested against PGlite's embedded PostgreSQL engine; external PostgreSQL connectivity and Docker deployment are not validated by that test.

## APIs

| Method/path | Behaviour |
| --- | --- |
| `GET /api/catalog` | Static sample catalogue; CDN cache 300s, stale-while-revalidate 3600s |
| `POST /api/orders` | Validated demo COD receipt. `Idempotency-Key` UUID required; no PII persisted |
| `POST /api/payments/verify` | Live-disabled signature-verification boundary; never marks a payment paid |
| `POST /api/payments/webhook` | Live-disabled signed event boundary; never acknowledges unpersisted events as processed |

Checkout JSON: `{ items: [{id, quantity}], name, phone, address, pincode, slot, payment, coupon }`. Demo checkout accepts any correctly formatted six-digit Indian pincode, including 192210. This validates format only and does not establish delivery coverage; live serviceability must use configured delivery zones. Use the slots displayed in checkout. COD demo limit: ₹25,000. Coupon: `WELCOME10` (10%, capped at ₹100). Tax is included in displayed B2C prices.

## Razorpay test/live integration checklist

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` securely on the server. The adapter only sends requests to `api.razorpay.com`; authorize this destination for outbound requests before integration testing. Never expose the secret or webhook key in browser bundles.

Before enabling the endpoints, persist an internal order and expected INR paise total, create and store its gateway order ID, then invoke hosted checkout. Verify checkout HMAC with the stored gateway order ID and fetch the payment to match amount, currency and captured status. For `payment.captured`, `payment.failed` and `refund.processed`, validate HMAC on the raw body and commit a unique event ID plus state transition in a database transaction. Only acknowledge events after durable commit. Reconcile timeouts using gateway lookups; do not blindly repeat payment/refund operations. Store no card details. Build and test stock reservation expiry/release, partial refunds and amount mismatch handling before taking real payments.

## Capacity target: 10,000 concurrent clients

The storefront is statically rendered and CDN-cacheable. Its initial JavaScript is approximately 115 kB compressed by Next's build report, with admin loaded as a separate route. Images and fonts are local; catalogue filtering/cart editing make no server requests. The catalogue API is also statically generated with CDN cache headers. A Node replica has no per-client session memory in this demonstration.

This reduces catalogue traffic costs, but **10,000-client capacity has not been proven**. Concurrent sessions are not the same as 10,000 checkout requests/second. Real capacity depends on browsing/checkout ratios, edge hit rate, database locks, gateway latency and deployment size.

Production design should put the static catalogue/assets behind a CDN, use autoscaled stateless API replicas, PgBouncer or a managed PostgreSQL pool, primary/replica database separation where appropriate, shared Redis rate limits/session storage, and queued notification/refund/invoice work. Bound total database connections across replicas rather than giving each replica an unbounded pool. Never use in-memory counters for shared inventory, credit, gateway event IDs or production sessions.

Checkout must reserve stock with a conditional atomic update (`stock - reserved >= requested`), inside the same transaction as the order/idempotency record; a lock/transaction must also enforce retailer credit and delivery capacity. Webhooks need unique provider event IDs and monotonic state transitions. Add observability for p95/p99 latency, cache hit rate, event lag, lock waits, stock mismatches and payment reconciliation failures.

`scripts/load-test.js` provides a **catalogue-only** k6 staging scenario ramping to 10,000 virtual clients with think time. It has not been run against 10,000 clients here. Run it against infrastructure you own using `BASE_URL=... k6 run scripts/load-test.js`; add separate authenticated checkout, concurrent inventory, credit and webhook scenarios before making a full-system capacity claim. Target p95 catalogue latency under 500 ms and less than 1% request failures, then size infrastructure from measured results.

## Validation

```sh
npm test                 # pricing/tax/credit/HMAC/API + SQL migration smoke test
npm run db:validate      # Prisma WASM datamodel validation
npm run db:generate      # generated client using JS query compiler
npm run build
npm run typecheck
# Start the app separately before browser tests:
npm run test:e2e
```

Browser tests use Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` if installed elsewhere, and `TEST_BASE_URL` if the app uses a different origin/port. Tests cover desktop/mobile search, filtering, favourites, checkout, receipt persistence, layout overflow and admin status edits. CI installs dependencies, generates the client, runs unit/database tests, builds and typechecks. Browser testing additionally needs Chromium installed.

### Validation recorded in this workspace

- Production build and TypeScript checks passed.
- 10 unit/API/database tests passed (including SQL migration and inventory constraints).
- 8 Playwright tests passed across desktop and mobile, including offline catalogue reload.
- Local catalogue smoke: 100 requests at concurrency 25, zero failures, observed p95 131 ms. This shared-machine result is not a production capacity benchmark.
- Native PostgreSQL migration CLI, Docker deployment, real SMS/payment services, new-environment restoration and the 10,000-client staging scenario were not executed.

### Development runtime cache errors

Development uses `.next-dev` while production builds use `.next`, so running a build cannot overwrite development chunks. Offline caching is enabled only in production; development removes this app's older service-worker registrations and caches without clearing carts or favourites.

If an older checkout shows `Cannot read properties of undefined (reading 'call')`, stop running Next.js processes, pull the update and reinstall with `npm ci`. Remove generated build caches with this cross-platform command, then restart with `npm run dev`:

```sh
node -e "for (const p of ['.next', '.next-dev']) require('node:fs').rmSync(p, { recursive: true, force: true })"
```

If the page crashes before it can remove an old worker, open the browser developer tools → Application → Service Workers → Unregister for this local site, then hard-refresh. Do not delete `app/page.tsx`; it is the rendering boundary, not proof that the component import is incorrect.

If the error occurs before the storefront mounts, its automatic cache cleanup cannot run. Open `/reset.html` on the **same localhost address and port** as the failing app, wait for confirmation, then use “Return to the store.” This standalone recovery page needs no React or Next.js JavaScript, removes only this app's service workers/offline caches and keeps saved carts/favourites. For a server-side stale development build, stop the server and use `npm run dev:clean` to regenerate `.next-dev`.
