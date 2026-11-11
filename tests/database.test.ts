import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
