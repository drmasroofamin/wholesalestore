import { z } from 'zod';
import { customerWrite, privateJson, setCustomerCookie } from '@/lib/customer-http';
import { verifyOtp } from '@/lib/customer-otp';
import {
  createVerifiedCustomerSession,
  customerCookie,
  revokeCustomerSession,
} from '@/lib/customer-auth';
import { readJson, apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    customerWrite(req);
    const data = z
      .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
      .parse(await readJson(req, 1024));
    const phone = await verifyOtp(data.challengeId, data.code);
    const result = await createVerifiedCustomerSession(phone);
    await revokeCustomerSession(customerCookie(req));
    return setCustomerCookie(privateJson({ customer: result.customer }), result.token);
  } catch (e) {
    return apiError(e);
  }
}
