import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('initial migration applies to PostgreSQL-compatible engine and enforces inventory constraints', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile('prisma/migrations/202611110001_initial/migration.sql', 'utf8'));
    const tables = await db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'",
    );
    assert.equal(tables.rows[0].count, 29);
    await db.exec(
      `INSERT INTO "Category" (id,name) VALUES ('cat','Rice'); INSERT INTO "Product" (id,name,"categoryId",image,hsn) VALUES ('rice','Rice','cat','/rice.svg','1006'); INSERT INTO "ProductVariant" (id,"productId",pack,price,mrp,stock) VALUES ('variant','rice','1 kg',10000,12000,10);`,
    );
    await assert.rejects(() =>
      db.exec(`UPDATE "ProductVariant" SET reserved=11 WHERE id='variant'`),
    );
    await db.exec(
      `UPDATE "ProductVariant" SET reserved=reserved+8 WHERE id='variant' AND stock-reserved>=8`,
    );
    const second = await db.query(
      `UPDATE "ProductVariant" SET reserved=reserved+8 WHERE id='variant' AND stock-reserved>=8 RETURNING id`,
    );
    assert.equal(second.rows.length, 0);
    await assert.rejects(() => db.exec(`INSERT INTO "Category" (id,name) VALUES ('cat2','Rice')`));
  } finally {
    await db.close();
  }
});

async function applyMigrations(db: PGlite) {
  const names = (await readdir('prisma/migrations')).filter((name) => /^\d/.test(name)).sort();
  for (const name of names) {
    await db.exec(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
  }
  return names;
}

test('biscuit migration inserts the test sku once and leaves an edited row alone', async () => {
  const db = new PGlite();
  try {
    const names = await applyMigrations(db);
    assert.ok(names.includes('202611120002_add_test_biscuit'));
    const sql = await readFile(
      'prisma/migrations/202611120002_add_test_biscuit/migration.sql',
      'utf8',
    );
    await db.exec(`UPDATE "ProductVariant" SET stock = 7 WHERE id = 'biscuit-default'`);
    await db.exec(sql);
    const product = await db.query<{
      name: string;
      hindi: string;
      hsn: string;
      gst: number;
      image: string;
      category: string;
    }>(
      `SELECT p.name, p.hindi, p.hsn, p.gst, p.image, c.name AS category
       FROM "Product" p JOIN "Category" c ON c.id = p."categoryId" WHERE p.id = 'biscuit'`,
    );
    assert.equal(product.rows.length, 1);
    assert.deepEqual(product.rows[0], {
      name: 'Glucose Biscuit',
      hindi: 'ग्लूकोज़ बिस्कुट',
      hsn: '1905',
      gst: 18,
      image: '/products/biscuit.webp',
      category: 'Biscuits & snacks',
    });
    const variant = await db.query<{ pack: string; price: number; mrp: number; stock: number }>(
      `SELECT pack, price, mrp, stock FROM "ProductVariant" WHERE id = 'biscuit-default'`,
    );
    assert.deepEqual(variant.rows, [{ pack: '1 pack', price: 500, mrp: 500, stock: 7 }]);
    const tiers = await db.query<{ minimum: number; price: number }>(
      `SELECT minimum, price FROM "PriceTier" WHERE "variantId" = 'biscuit-default' ORDER BY minimum`,
    );
    assert.deepEqual(tiers.rows, [
      { minimum: 10, price: 450 },
      { minimum: 50, price: 432 },
    ]);
    const categories = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "Category" WHERE name = 'Biscuits & snacks'`,
    );
    assert.equal(categories.rows[0].count, 1);
  } finally {
    await db.close();
  }
});

test('biscuit migration fills a seed-shaped row without duplicating tiers', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile('prisma/migrations/202611110001_initial/migration.sql', 'utf8'));
    await db.exec(
      `INSERT INTO "Category" (id, name) VALUES ('seed-cat', 'Biscuits & snacks');
       INSERT INTO "Product" (id, name, hindi, "categoryId", image, hsn, gst)
       VALUES ('biscuit', 'Old name', 'पुराना', 'seed-cat', '/old.webp', '0000', 5);
       INSERT INTO "ProductVariant" (id, "productId", pack, price, mrp, stock)
       VALUES ('biscuit-default', 'biscuit', '1 pack', 500, 500, 0);
       INSERT INTO "PriceTier" (id, "variantId", minimum, price)
       VALUES ('seed-tier', 'biscuit-default', 10, 450);`,
    );
    await db.exec(
      await readFile('prisma/migrations/202611120002_add_test_biscuit/migration.sql', 'utf8'),
    );
    const product = await db.query<{ name: string; category_id: string }>(
      `SELECT name, "categoryId" AS category_id FROM "Product" WHERE id = 'biscuit'`,
    );
    assert.deepEqual(product.rows, [{ name: 'Old name', category_id: 'seed-cat' }]);
    const tiers = await db.query<{ minimum: number; price: number }>(
      `SELECT minimum, price FROM "PriceTier" WHERE "variantId" = 'biscuit-default' ORDER BY minimum`,
    );
    assert.deepEqual(tiers.rows, [
      { minimum: 10, price: 450 },
      { minimum: 50, price: 432 },
    ]);
    const categories = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "Category" WHERE name = 'Biscuits & snacks'`,
    );
    assert.equal(categories.rows[0].count, 1);
  } finally {
    await db.close();
  }
});

test('anantnag zone migration inserts each district pincode once and keeps admin edits', async () => {
  const db = new PGlite();
  try {
    const names = await applyMigrations(db);
    assert.ok(names.includes('202611120003_anantnag_zones'));
    const pins = [
      '192101',
      '192122',
      '192124',
      '192125',
      '192126',
      '192129',
      '192201',
      '192202',
      '192210',
      '192211',
      '192212',
      '192221',
      '192401',
    ];
    const zones = await db.query<{
      pincode: string;
      fee: number;
      freeAbove: number;
      codLimit: number;
      active: boolean;
    }>(`SELECT pincode, fee, "freeAbove", "codLimit", active FROM "DeliveryZone" ORDER BY pincode`);
    assert.deepEqual(
      zones.rows.map((zone) => zone.pincode),
      pins,
    );
    for (const zone of zones.rows) {
      assert.equal(zone.fee, 2500);
      assert.equal(zone.freeAbove, 50000);
      assert.equal(zone.codLimit, 500000);
      assert.equal(zone.active, true);
    }
    const excluded = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "DeliveryZone" WHERE pincode IN ('192231', '192232', '192233')`,
    );
    assert.equal(excluded.rows[0].count, 0);
    await db.exec(`UPDATE "DeliveryZone" SET fee = 1, "freeAbove" = 1 WHERE pincode = '192210'`);
    await db.exec(
      await readFile('prisma/migrations/202611120003_anantnag_zones/migration.sql', 'utf8'),
    );
    const edited = await db.query<{ fee: number; freeAbove: number; count: number }>(
      `SELECT fee, "freeAbove", (SELECT count(*)::int FROM "DeliveryZone") AS count
       FROM "DeliveryZone" WHERE pincode = '192210'`,
    );
    assert.deepEqual(edited.rows, [{ fee: 1, freeAbove: 1, count: 13 }]);
  } finally {
    await db.close();
  }
});

test('customer-account migration keeps existing customer and address data and enforces one default', async () => {
  const db = new PGlite();
  try {
    const names = (await readdir('prisma/migrations')).filter((n) => /^\d/.test(n)).sort();
    for (const name of names.filter((n) => n < '202611120004_customer_accounts'))
      await db.exec(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
    await db.exec(
      `INSERT INTO "User" (id,phone,name) VALUES ('existing-customer','9876543210','Existing Customer'); INSERT INTO "Address" (id,"userId",line,pincode) VALUES ('old-address','existing-customer','Existing house in Anantnag','192210'); UPDATE "ProductVariant" SET stock=17 WHERE id='biscuit-default'`,
    );
    await db.exec(
      await readFile('prisma/migrations/202611120004_customer_accounts/migration.sql', 'utf8'),
    );
    const result = await db.query<{
      name: string;
      phoneVerifiedAt: null;
      line: string;
      pincode: string;
    }>(
      `SELECT u.name,u."phoneVerifiedAt",a.line,a.pincode FROM "User" u JOIN "Address" a ON a."userId"=u.id WHERE u.id='existing-customer'`,
    );
    assert.deepEqual(result.rows, [
      {
        name: 'Existing Customer',
        phoneVerifiedAt: null,
        line: 'Existing house in Anantnag',
        pincode: '192210',
      },
    ]);
    assert.equal(
      (
        await db.query<{ stock: number }>(
          `SELECT stock FROM "ProductVariant" WHERE id='biscuit-default'`,
        )
      ).rows[0].stock,
      17,
    );
    await db.exec(`UPDATE "Address" SET "isDefault"=true WHERE id='old-address'`);
    await assert.rejects(() =>
      db.exec(
        `INSERT INTO "Address" (id,"userId",line,pincode,"isDefault") VALUES ('second-default','existing-customer','Another test house','192210',true)`,
      ),
    );
  } finally {
    await db.close();
  }
});
