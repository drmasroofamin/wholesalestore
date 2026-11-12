import { customerWrite, privateJson, setCustomerCookie } from '@/lib/customer-http';
import { customerCookie, revokeCustomerSession } from '@/lib/customer-auth';
import { apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    customerWrite(req);
    await revokeCustomerSession(customerCookie(req));
    return setCustomerCookie(privateJson({ ok: true }), '');
  } catch (e) {
    return apiError(e);
  }
}
