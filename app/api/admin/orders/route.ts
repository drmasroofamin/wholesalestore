import { adminFromRequest } from '@/lib/admin-auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
export async function GET(req: Request) {
  if (!adminFromRequest(req))
    return Response.json({ error: 'Sign in to view orders' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q')?.slice(0, 100) || '';
    const cursor = url.searchParams.get('cursor') || undefined;
    const orders = await database().order.findMany({
      where: query
        ? {
            OR: [
              { id: { contains: query, mode: 'insensitive' } },
              { customerName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      include: { items: true, history: { orderBy: { createdAt: 'asc' } }, payments: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return Response.json(
      { orders: orders.slice(0, 50), nextCursor: orders.length > 50 ? orders[49].id : null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
