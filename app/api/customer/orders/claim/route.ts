import { z } from 'zod';
import { customerWrite, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { canReadReceipt } from '@/lib/admin-auth';
import { database } from '@/lib/db';
import { StoreError } from '@/lib/live-config';
import { readJson, apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    customerWrite(req);
    const customer = await requireCustomer(req);
    const { id } = z.object({ id: z.string().min(1).max(100) }).parse(await readJson(req, 1024));
    if (!canReadReceipt(req, id)) throw new StoreError('Private receipt access required', 403);
    const result = await database().order.updateMany({
      where: { id, phone: customer.phone, OR: [{ userId: null }, { userId: customer.id }] },
      data: { userId: customer.id },
    });
    if (!result.count) throw new StoreError('Order not found', 404);
    return privateJson({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
