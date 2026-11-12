import { database } from '../lib/db';
import { products } from '../lib/catalog';
const db = database();
async function main() {
  for (const p of products) {
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
      update: {},
    });
  }
  console.log(
    'Seeded 8 products without overwriting existing prices or stock. New products start at zero stock unless SEED_SAMPLE_STOCK=true.',
  );
}
main().finally(() => db.$disconnect());
