import { canReadReceipt } from '@/lib/admin-auth';
import { publicOrder, readOrder } from '@/lib/live-orders';
import { apiError } from '@/lib/http';
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!canReadReceipt(req, id))
      return Response.json({ error: 'Order receipt access is required' }, { status: 403 });
    const order = await readOrder(id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    return Response.json(publicOrder(order), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
