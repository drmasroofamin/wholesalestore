import { z } from 'zod';
import { validSignature, sameOrigin } from '@/lib/security';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  // A browser signature alone must never change order payment state.
  const key = process.env.RAZORPAY_KEY_SECRET;
  if (!key || process.env.DEMO_MODE !== 'false')
    return Response.json({ error: 'Live payment processing is not enabled' }, { status: 503 });
  const parsed = z
    .object({
      orderId: z.string().max(100),
      paymentId: z.string().max(100),
      signature: z.string().length(64),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid verification request' }, { status: 400 });
  const { orderId, paymentId, signature } = parsed.data;
  if (!validSignature(`${orderId}|${paymentId}`, signature, key))
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  return Response.json(
    { error: 'Gateway signature verified; durable order reconciliation is not configured' },
    { status: 503 },
  );
}
