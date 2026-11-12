import { customerAccountsEnabled, customerFromRequest } from '@/lib/customer-auth';
import { canReadReceipt } from '@/lib/admin-auth';
import { publicOrder, readOrder } from '@/lib/live-orders';
import { apiError } from '@/lib/http';
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bearer = canReadReceipt(req, id);
    const customer = !bearer && customerAccountsEnabled() ? await customerFromRequest(req) : null;
    if (!bearer && !customer)
      return Response.json(
        { error: 'Order receipt access is required' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    const order = await readOrder(id);
    if (!bearer && order?.userId !== customer?.id)
      return Response.json(
        { error: 'Order not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    return Response.json(publicOrder(order), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
