import { validSignature } from '@/lib/security';
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || process.env.DEMO_MODE !== 'false')
    return Response.json({ error: 'Live webhooks are not enabled' }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 64000) return Response.json({ error: 'Payload too large' }, { status: 413 });
  if (!validSignature(raw, req.headers.get('x-razorpay-signature') || '', secret))
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  // Never acknowledge an event before its durable, unique event ID and associated
  // order amount/currency have been verified and committed atomically.
  return Response.json(
    { error: 'Durable webhook reconciliation is not configured; retry later' },
    { status: 503 },
  );
}
