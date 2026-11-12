import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { products } from '../lib/catalog';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
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
            stock: p.stock,
            tiers: {
              create: [
                { minimum: 10, price: p.wholesale },
                { minimum: 50, price: Math.round(p.wholesale * 0.96) },
              ],
            },
          },
        },
      },
      update: {
        image: p.image,
        name: p.name,
        hindi: p.hindi,
      },
    });
  }
  console.log(
    'Seeded 8 products. Existing prices and stock were left unchanged; photos were refreshed.',
  );
}
main().finally(() => db.$disconnect());
