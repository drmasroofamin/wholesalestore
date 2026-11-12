# Grain & Good — operations guide

This guide is for the store owner. It describes what the shop actually does today, what you must change before taking real orders, and what a customer can and cannot do.

The current release is a working demonstration. People can browse, fill a cart, and place a cash-on-delivery **demo** order. No money is collected, no delivery is booked, and the admin screens do not read or write the live database. Setting `DEMO_MODE=false` does **not** turn the shop on. Checkout then answers “not enabled” (HTTP 503) until the missing live pieces are built.

Prices in the code are stored in paise. ₹649 is `64900`.

---

## Part A — What you must set up before going live

Work through this list. For each item, “Admin screen” means the page at `/admin`. If a field only says “demo” or “this session”, saving it does not change what customers see.

### 1. Brand name, look, and contact

| What customers see                                                   | Where it is set today                                                                          | What to change before launch                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| “grain & good”, the tagline “ROOTED IN GOODNESS”, and the wheat mark | `components/storefront.tsx` (header and footer)                                                | Edit that file. There is no brand screen that publishes a new name.                                             |
| Browser title and description                                        | `app/layout.tsx`                                                                               | Edit the `title` and `description`.                                                                             |
| Home-page headline, announcement bar, and the three trust lines      | `components/storefront.tsx`                                                                    | Edit the text in that file. The Hindi headline is the only translated headline.                                 |
| Phone number in the footer, `+91 194 245 0000`                       | `components/storefront.tsx` footer                                                             | Replace this sample number with your real support line.                                                         |
| App icon and install name                                            | `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/manifest.webmanifest` | Replace the icon files and the name in the manifest.                                                            |
| Homepage photo                                                       | `public/harvest.webp`                                                                          | Replace the file and keep the credit in `public/products/CREDITS.md`.                                           |
| Admin “Store name”                                                   | `/admin` → **Settings**                                                                        | This box starts as “Grain & Good”. **Save demo preferences** only shows a message. It does not rename the shop. |

The admin header always says “Merchant Admin / Demo workspace”. That label is hardcoded in `app/admin/page.tsx`. It is not a signed-in user.

### 2. Catalogue, prices, and tax

Customers see eight products defined in `lib/catalog.ts`:

| Product                    | Pack    | Selling price | MRP  | Wholesale (not used at checkout) | GST | HSN  |
| -------------------------- | ------- | ------------- | ---- | -------------------------------- | --- | ---- |
| Premium Basmati Rice       | 5 kg    | ₹649          | ₹799 | ₹595                             | 5%  | 1006 |
| Chakki Fresh Atta          | 5 kg    | ₹225          | ₹280 | ₹205                             | 5%  | 1101 |
| Unpolished Toor Dal        | 1 kg    | ₹159          | ₹195 | ₹145                             | 5%  | 0713 |
| Cold Pressed Mustard Oil   | 1 litre | ₹189          | ₹240 | ₹172                             | 5%  | 1514 |
| Whole Green Moong          | 1 kg    | ₹129          | ₹160 | ₹117                             | 5%  | 0713 |
| Natural Sulphur-free Sugar | 1 kg    | ₹55           | ₹65  | ₹48                              | 5%  | 1701 |
| Organic Pearl Millet       | 1 kg    | ₹89           | ₹115 | ₹79                              | 5%  | 1008 |
| Premium Kabuli Chana       | 1 kg    | ₹149          | ₹180 | ₹135                             | 5%  | 0713 |

Selling prices are GST-inclusive. The cart shows the included GST using a 5% split in `lib/rules.ts`.

**Where a price change actually reaches the customer:** edit `price`, `mrp`, and `wholesale` in `lib/catalog.ts`, then restart the app. The storefront and `POST /api/orders` both price from that file. They do not read the database.

**What does not change the shop:**

- `/admin` → **Products** lets you type a rupee price. It lives in that browser tab only. The note under the table says demo changes do not modify the storefront or the database.
- `/admin` → **Settings** does not have a price list.
- `npm run db:seed` reads `.env` when that file exists, then copies new products into PostgreSQL. If a product already exists it refreshes the photo and name only. It does **not** overwrite variant price or stock. The shop still ignores those database prices.

Wholesale numbers are stored as price tiers (10 bags at the wholesale price, 50 bags at 4% less) by `prisma/seed.ts`. Checkout always uses the household price. Registering a shop does not unlock those tiers.

There is no screen to add a ninth product. A new item needs a row in `lib/catalog.ts`, a photo under `public/products/`, a category count update, and a seed run for the database copy. The database copy is not what the shop displays today.

### 3. Stock

The number of packs a customer can add is `stock` in `lib/catalog.ts` (for example 120 bags of basmati). The cart will not go above that number, and checkout rejects a quantity above it.

`/admin` → **Inventory** lets you type a stock number for the session. It does not change the shop and does not write `ProductVariant.stock` in the database. The low-stock label (10 or fewer) on that screen is display-only.

Nothing reserves stock when an order is placed, so two people can “buy” the same last bag. A live shop has to decrement stock inside the same database transaction as the order.

### 4. Delivery areas, pincodes, and slots

Checkout accepts any six-digit Indian pincode that does not start with 0. `110001`, `190001`, and `192210` all pass. `000000` and `19221` do not. The rule is in `lib/pincode.ts`. It checks the shape of the number only.

The database has a `DeliveryZone` table (pincode, fee, free-delivery amount, COD limit, active flag). Nothing seeds it and nothing reads it. `/admin` → **Settings** → “Demo delivery pincodes” is a locked box that says any valid six-digit pincode is allowed. You cannot type a service area there.

The location button (“Delivering to Srinagar, 190001”) only changes the label in that browser session and prefills checkout. It is not saved, and it does not check whether you deliver there.

Slots the customer can pick are fixed in `components/storefront.tsx` and must match `app/api/orders/route.ts`:

- Today, 4 PM – 7 PM
- Tomorrow, 9 AM – 12 PM
- Tomorrow, 4 PM – 7 PM

There is no capacity, no cutoff time, and no courier. The `DeliverySlot` table is unused. `/admin` → **Delivery** lists sample orders that are already “Packed” or “Out for delivery” and lets you change that label for the session. It does not assign a rider or message the customer.

Before launch you need a real list of pincodes, a check at checkout against that list, and slots that come from capacity you control. The schema is a sketch of that, not a working setup.

### 5. Delivery fee and the ₹999 free-delivery line

Today the rule is in one place that actually charges the customer, and two places that only display it.

| Behaviour                                                                                                             | Where                                                |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Free delivery when the item subtotal is ₹999 or more. Otherwise a ₹39 fee. The coupon does not count toward the ₹999. | `lib/rules.ts` (`99900` and `3900` paise)            |
| Announcement: “Free delivery on orders above ₹999”                                                                    | `components/storefront.tsx`                          |
| Cart progress: “Add ₹… for free delivery”                                                                             | `components/storefront.tsx` (also hardcoded `99900`) |
| “Free delivery above (₹)” default 999, and “Cash on delivery limit (₹)” default 25000                                 | `/admin` → **Settings**                              |

Saving settings does not change the fee. To change the threshold or the ₹39 fee you must edit `lib/rules.ts` **and** the two sentences in `components/storefront.tsx`, or they will disagree.

Cash on delivery is refused above ₹25,000 by `app/api/orders/route.ts` (`2500000` paise). The settings box does not enforce that.

### 6. Payments

The checkout form offers Cash on delivery, UPI, Card, and Netbanking.

- **Cash on delivery** places a demo receipt. Nothing is charged. Payment status on the receipt is `COD_PENDING`.
- **UPI, Card, and Netbanking** are refused with “Online payments require a configured gateway.”
- Putting Razorpay keys in the environment does not open online payment. `POST /api/payments/verify` and `POST /api/payments/webhook` stay disabled until `DEMO_MODE=false` **and** the matching secret is set, and even then they refuse to mark an order paid because there is no saved order to reconcile.
- The footer badges for UPI, Visa, and RuPay are decoration.

Keys, if you later connect a gateway, belong only on the server: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in the environment (see `.env.example`). Never put the secret in a `NEXT_PUBLIC_` variable. `/admin` → **Payments** is a sample table. It is not linked to Razorpay.

`DEMO_MODE=false` turns the demo checkout off. Leave it `true` until orders, stock, and payments are actually wired. Do not treat that flag as a launch switch.

### 7. Policies and legal identity

The page at `/policies` is linked from checkout (“terms & refund policy”). The text is a draft in `app/policies/page.tsx`. It tells people this is a demonstration, that contact details are not stored, and that refunds and delivery areas are not real.

Before launch, replace that page with your real privacy notice, terms, cancellation window, damaged-goods rule, and refund timeline. Also publish:

- legal business name and address
- GSTIN
- FSSAI licence number (the app does not have a field for it anywhere)
- the support phone and email you will actually answer

There is no admin editor for policies.

### 8. Who can open admin, and which environment variables matter

`/admin` has no login. Anyone who can open the URL sees the workspace. The link is also in the storefront footer. Before launch, remove that public link and put the workspace behind real sign-in. There is no admin password variable today.

Copy `.env.example` to `.env` on the server. Do not commit `.env`.

| Variable                                                            | What it does now                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DEMO_MODE`                                                         | `true` (or unset) allows demo cash-on-delivery. `false` makes checkout return 503.                                                |
| `APP_ORIGIN`                                                        | If set, checkout is rejected when the browser’s origin does not match exactly, for example `https://shop.example.com`.            |
| `DATABASE_URL`                                                      | Used by Prisma (`lib/db.ts`) and by seed. The shop pages do not query it for products or orders.                                  |
| `REDIS_URL`                                                         | Read only if code calls the rate-limit helper in `lib/security.ts`. No route calls that helper yet. Checkout works without Redis. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Server-only. Not enough, on their own, to take payment.                                                                           |

### 9. Database and Redis

Local services are described in `compose.yaml`: Postgres user `grain`, database `grain`, and Redis. The password in that file is for local development only. Production needs managed credentials, TLS, backups, and a private network.

Useful commands:

```sh
npm run db:generate
npm run db:migrate    # reviewed SQL migrations for a real database
npm run db:seed       # inserts the 8 products; refreshes photos on later runs
```

`npm run db:push` is only for a disposable development database. Do not use it on a database you need to keep.

Seeded tables are categories and products (with one pack each and two wholesale tiers). Orders, coupons, delivery zones, users, and invoices are not seeded. Placing a demo order does not insert a row.

Redis is optional for this demo. When you add login or checkout limits, point `REDIS_URL` at a shared Redis and actually call the helper. An in-memory counter will not work across more than one server.

### 10. Domain

The app is a Next.js server (`npm run build` then `npm start`, or the Docker image). Set `APP_ORIGIN` to the public https address customers use, including the scheme and host, with no path. A mismatch makes checkout return “Invalid origin”.

Put the site behind HTTPS. The demo does not configure a domain, certificate, or DNS.

### 11. Coupon

The only code that works is `WELCOME10`: 10% off, capped at ₹100. It is checked in both `lib/rules.ts` and the cart form in `components/storefront.tsx`. The `Coupon` table is unused, and admin has no coupon screen. Add or retire codes in those two files together.

### 12. Photos

Product photos live in `public/products/*.webp` and are named from `lib/catalog.ts`. The homepage photo is `public/harvest.webp`. Sources and licences are in `public/products/CREDITS.md`. The service worker lists those files in `public/sw.js` (cache name `grain-good-v2`). If you replace a photo, keep the same path or update the catalogue, the category image, the service-worker list, and the credits.

---

## Part B — What a customer can do

### Browse

The home page lists all eight products. Customers can:

- open a category (Rice, Atta & flour, Pulses & dals, Millets, Oils & ghee, Sugar & spices) or “Shop all”
- filter by pack: 1 kg, 5 kg, or 1 litre
- sort by popular (the catalogue order), price, or rating
- search English or Hindi names (`बासमती`, `दाल`, and so on)
- open a product for pack size, HSN, stock count, and price
- see a percentage off the MRP

Search and filters happen in the browser. They do not call the server. `GET /api/catalog` returns the same static list, with a five-minute cache header, but the page does not use that API.

### Language

The announcement bar switches between **हिन्दी** and **English**. Hindi changes the hero headline, the search box placeholder, and the product title (the `hindi` name). Descriptions, buttons, cart, checkout, errors, and policies stay in English.

### Location

**Delivering to** asks for a pincode and, if the six digits are valid, shows `PIN` plus that number. It does not confirm that you deliver there. Refreshing the page returns the label to “Srinagar, 190001”. Checkout starts with that pincode, or with the one just entered.

### Favourites and cart

The heart saves a product on this device (`localStorage` key `gg-wish`). The wishlist button filters the grid to saved items.

**ADD** puts a pack in the cart (`gg-cart`). Plus and minus change the quantity, up to the sample stock. The cart shows subtotal, ₹39 or free delivery, coupon savings, GST included, and the total. The mobile bar at the bottom shows the count and total.

`WELCOME10` applies in the cart. Any other code is rejected. The discount is capped at ₹100.

### Checkout

**Continue to checkout** asks for:

- name (at least 2 characters)
- mobile number starting with 6, 7, 8, or 9, ten digits
- address (at least 10 characters)
- six-digit pincode
- one of the three slots
- a payment method

**Place demo order** sends that to `POST /api/orders`. The server recalculates the total from the catalogue. It does not trust the price on the page. A successful cash-on-delivery demo returns an order number like `GG-` plus ten characters, the total, and status `PLACED` / `COD_PENDING`.

The customer then sees “Your demo order is placed!”, a timeline stuck on **Placed**, and a button to download a text file. That file says it is not a tax invoice.

The same browser keeps the latest receipt (`gg-order`) after a reload, under Account → My orders. Only the latest receipt is kept. The cart is emptied. Ordering again replaces the receipt.

Trying UPI, card, or netbanking shows an error and does not create a receipt. A second click with the same checkout key returns the same order number; nothing extra is stored.

### Business accounts

**Buying for your business?** collects a shop name, owner, mobile, and optional GSTIN. It saves that on the device (`gg-retailer`) and says approval needs a connected backend. It does not create a login, a wholesale price, or credit.

### Admin, from the customer’s side

The footer links to `/admin`. That workspace shows six sample orders (Aamina Khan, Bhat General Store, and so on). The customer’s new receipt is not in that list. Changing a sample order’s status, exporting CSV, approving the sample retailer “Zainab Provision Store”, or editing a sample price lasts until the tab is closed.

### Offline

In a production build, a service worker can show the catalogue again after one online visit. It does not cache admin, APIs, or checkout. Offline checkout is not available. Development mode removes this app’s old service workers instead of caching.

### Customer-facing gaps

These are missing or only pretend to work. They need product work, not a settings tick.

1. **The order is not a real order.** Name, phone, and address are checked and then discarded. Admin cannot see, confirm, pack, or cancel that order. Status never moves past Placed.
2. **No sign-in.** There is no OTP, password, or order history beyond the one receipt on that device. Clearing site data deletes the cart, favourites, and receipt.
3. **Delivery is not real.** Any well-formed pincode is accepted. Slots are three fixed labels. Nobody is dispatched. The ₹39 fee and ₹999 threshold cannot be changed per area.
4. **Online payment does not work.** Only the demo cash-on-delivery path returns a receipt, and it collects no money. The card and UPI marks in the footer overstate what checkout can do.
5. **Stock and prices the merchant edits in admin do not affect shoppers.** Two customers are not protected from overselling.
6. **Wholesale and credit are advertising.** The business form does not grant bulk prices, GST invoices, or a khata limit.
7. **Hindi is partial.** Most of the shop, including errors and checkout, is English only.
8. **Policies, phone number, and tax identity are samples.** Do not send customers to `+91 194 245 0000` or the current `/policies` page once you take real orders.
9. **No invoice, refund, return, review, or notification.** The receipt download is a text file. There is no SMS or email when a status would change.
10. **Admin is public** and linked from the shop. Treat everything on it as sample data until it requires a login and reads the database.
