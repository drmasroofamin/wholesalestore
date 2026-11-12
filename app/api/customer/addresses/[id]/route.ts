import { customerWrite, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { removeAddress } from '@/lib/customer-profile';
import { apiError } from '@/lib/http';
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    customerWrite(req);
    const customer = await requireCustomer(req);
    return privateJson({ customer: await removeAddress(customer.id, (await ctx.params).id) });
  } catch (e) {
    return apiError(e);
  }
}
