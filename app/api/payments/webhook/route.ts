import { validSignature } from '@/lib/security';
import { liveMode, StoreError } from '@/lib/live-config';
import { readText, apiError } from '@/lib/http';
import { processWebhook } from '@/lib/live-payments';
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !liveMode())
    return Response.json({ error: 'Live webhooks are not enabled' }, { status: 503 });
  try {
    const raw = await readText(req, 64000);
    if (!validSignature(raw, req.headers.get('x-razorpay-signature') || '', secret))
      throw new StoreError('Invalid signature');
    await processWebhook(raw);
    return Response.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
