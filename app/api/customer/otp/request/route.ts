import { z } from 'zod';
import { customerWrite, privateJson } from '@/lib/customer-http';
import { requestOtp } from '@/lib/customer-otp';
import { readJson, apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    customerWrite(req);
    const { phone } = z.object({ phone: z.string().max(30) }).parse(await readJson(req, 1024));
    const ip = process.env.VERCEL === '1' ? req.headers.get('x-real-ip') || 'unknown' : 'shared';
    return privateJson(await requestOtp(phone, ip));
  } catch (e) {
    return apiError(e);
  }
}
