-- Cheap Glucose Biscuit (₹5) so a Razorpay test-mode payment can be placed.
-- Safe to run again: existing rows are left as they are, including stock an admin has changed.

INSERT INTO "Category" ("id", "name")
VALUES ('cat-biscuits-snacks', 'Biscuits & snacks')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Product" (
  "id",
  "name",
  "hindi",
  "categoryId",
  "image",
  "hsn",
  "gst",
  "active"
)
SELECT
  'biscuit',
  'Glucose Biscuit',
  'ग्लूकोज़ बिस्कुट',
  c."id",
  '/products/biscuit.webp',
  '1905',
  18,
  true
FROM "Category" c
WHERE c."name" = 'Biscuits & snacks'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "pack",
  "price",
  "mrp",
  "stock",
  "reserved",
  "lowStockThreshold"
)
SELECT
  'biscuit-default',
  'biscuit',
  '1 pack',
  500,
  500,
  100,
  0,
  10
WHERE EXISTS (SELECT 1 FROM "Product" WHERE "id" = 'biscuit')
ON CONFLICT ("id") DO NOTHING;

-- Same two wholesale tiers the seed creates: 10+ at ₹4.50, 50+ at round(₹4.50 * 0.96).
INSERT INTO "PriceTier" ("id", "variantId", "minimum", "price")
SELECT 'biscuit-tier-10', 'biscuit-default', 10, 450
WHERE EXISTS (SELECT 1 FROM "ProductVariant" WHERE "id" = 'biscuit-default')
  AND NOT EXISTS (
    SELECT 1 FROM "PriceTier" WHERE "variantId" = 'biscuit-default' AND "minimum" = 10
  );

INSERT INTO "PriceTier" ("id", "variantId", "minimum", "price")
SELECT 'biscuit-tier-50', 'biscuit-default', 50, 432
WHERE EXISTS (SELECT 1 FROM "ProductVariant" WHERE "id" = 'biscuit-default')
  AND NOT EXISTS (
    SELECT 1 FROM "PriceTier" WHERE "variantId" = 'biscuit-default' AND "minimum" = 50
  );
