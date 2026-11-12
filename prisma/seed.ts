import { database } from '../lib/db';
import { products, Product } from '../lib/catalog';
import { ensureDeliverySlots } from '../lib/delivery-slots';
const db = database();
async function seedProduct(p: Product) {
  const c = await db.category.upsert({
    where: { name: p.category },
    create: { name: p.category },
    update: {},
  });
  await db.product.upsert({
    where: { id: p.id },
    create: {
      id: p.id,
      name: p.name,
      hindi: p.hindi,
      image: p.image,
      categoryId: c.id,
      hsn: p.hsn,
      gst: p.gst,
      variants: {
        create: {
          id: p.id + '-default',
          pack: p.pack,
          price: p.price,
          mrp: p.mrp,
          stock: process.env.SEED_SAMPLE_STOCK === 'true' ? p.stock : 0,
          tiers: {
            create: [
              { minimum: 10, price: p.wholesale },
              { minimum: 50, price: Math.round(p.wholesale * 0.96) },
            ],
          },
        },
      },
    },
    update: { image: p.image, name: p.name, hindi: p.hindi },
  });
}
async function main() {
  const existing = await db.product.findMany({ select: { id: true } });
  const present = new Set(existing.map((row) => row.id));
  const missing = products.filter((p) => !present.has(p.id));
  // Deploy runs migrations before seed. A data migration may insert one product
  // into an otherwise empty database; still seed the rest, and never rewrite
  // prices or stock that are already stored.
  if (existing.length > 0 && missing.length === 0) {
    console.log('Catalog already present; skipping seed.');
  } else {
    for (const p of existing.length === 0 ? products : missing) await seedProduct(p);
    console.log(
      existing.length === 0
        ? `Seeded ${products.length} products without overwriting existing prices or stock. Product photos and names were refreshed. New products start at zero stock unless SEED_SAMPLE_STOCK=true.`
        : `Catalog already had ${existing.length} products. Added ${missing.length} missing catalog product(s) without changing existing prices or stock. New products start at zero stock unless SEED_SAMPLE_STOCK=true.`,
    );
  }
  const created = await ensureDeliverySlots(7, 20, db);
  console.log(`Delivery slots ensured for the next 7 days at capacity 20. Created ${created}.`);
}
main().finally(() => db.$disconnect());
