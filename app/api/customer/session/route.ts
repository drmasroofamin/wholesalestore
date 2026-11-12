import { accountEnabled, privateJson } from '@/lib/customer-http';
import { customerFromRequest } from '@/lib/customer-auth';
import { otpConfigured } from '@/lib/otp';
import { apiError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    accountEnabled();
    return privateJson({ customer: await customerFromRequest(req), otpAvailable: otpConfigured() });
  } catch (e) {
    return apiError(e);
  }
}
