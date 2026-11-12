import { accountEnabled, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { customerOrders } from '@/lib/customer-orders';
import { apiError } from '@/lib/http';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    accountEnabled();
    const customer = await requireCustomer(req);
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(req.url).searchParams.get('page') || 0);
    return privateJson(await customerOrders(customer.id, page));
  } catch (e) {
    return apiError(e);
  }
}
