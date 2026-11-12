import { database } from './db';
import { Product } from './catalog';
export async function liveCatalog(): Promise<Product[]> {
  const variants = await database().productVariant.findMany({
    where: { id: { endsWith: '-default' }, product: { active: true } },
    include: { product: { include: { category: true } }, tiers: { orderBy: { minimum: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  const reviews = await database().review.groupBy({ by: ['productId'], _avg: { rating: true } });
  return variants.map((v) => ({
    id: v.productId,
    name: v.product.name,
    hindi: v.product.hindi || v.product.name,
    category: v.product.category.name,
    pack: v.pack,
    price: v.price,
    mrp: v.mrp,
    wholesale: v.tiers[0]?.price || v.price,
    image: v.product.image,
    stock: v.stock - v.reserved,
    hsn: v.product.hsn,
    gst: v.product.gst,
    rating:
      reviews.find((review) => review.productId === v.productId)?._avg.rating?.toFixed(1) || 'New',
  }));
}
