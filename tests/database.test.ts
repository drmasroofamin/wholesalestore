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
