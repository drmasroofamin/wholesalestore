import { customerWrite, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { ownedOrder } from '@/lib/customer-orders';
import { gatewayOrder } from '@/lib/live-payments';
import { publicOrder } from '@/lib/live-orders';
import { apiError } from '@/lib/http';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    customerWrite(req);
    const customer = await requireCustomer(req);
    const order = await ownedOrder(customer.id, (await ctx.params).id);
    return privateJson({ ...publicOrder(order), payment: await gatewayOrder(order) });
  } catch (e) {
    return apiError(e);
  }
}
