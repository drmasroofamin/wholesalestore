import { products } from '@/lib/catalog';
import { liveCatalog } from '@/lib/live-catalog';
import { liveMode } from '@/lib/live-config';
import { apiError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(
      { products: liveMode() ? await liveCatalog() : products, nextCursor: null },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=5' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
