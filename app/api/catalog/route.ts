import { products } from '@/lib/catalog';
export const revalidate = 300;
export async function GET() {
  return Response.json(
    { products, nextCursor: null },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  );
}
