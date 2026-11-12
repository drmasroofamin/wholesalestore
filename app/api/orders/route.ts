import { z } from 'zod';
import { createHash } from 'node:crypto';
import { quote } from '@/lib/rules';
import { sameOrigin } from '@/lib/security';
import { PINCODE_REGEX, PINCODE_HINT } from '@/lib/pincode';
import { liveMode, liveSettings, onlinePaymentsEnabled, StoreError } from '@/lib/live-config';
import { orderInput } from '@/lib/order-input';
import { placeOrder, publicOrder } from '@/lib/live-orders';
import { gatewayOrder } from '@/lib/live-payments';
import { rateLimit } from '@/lib/security';
import { readJson, apiError } from '@/lib/http';
const schema = z.object({
  items: z
    .array(z.object({ id: z.string().max(50), quantity: z.number().int().min(1).max(500) }))
    .min(1)
    .max(50),
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(10).max(500),
  pincode: z.string().trim().regex(PINCODE_REGEX, PINCODE_HINT),
  slot: z.enum(['Today, 4 PM – 7 PM', 'Tomorrow, 9 AM – 12 PM', 'Tomorrow, 4 PM – 7 PM']),
  payment: z.enum(['COD', 'UPI', 'Card', 'Netbanking']),
  coupon: z.string().max(30).default(''),
});
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  if (liveMode()) {
    try {
      liveSettings();
      if (process.env.ACCEPT_ORDERS !== 'true')
        throw new StoreError(
          'The store is not accepting new orders yet. Please contact the merchant.',
          503,
        );
      const data = orderInput.parse(await readJson(req));
      const key = z.string().uuid().parse(req.headers.get('Idempotency-Key'));
      if (data.payment !== 'COD' && !onlinePaymentsEnabled())
        throw new StoreError(
          'Online payments are not enabled. Please choose cash on delivery.',
          503,
        );
      if (
        !(await rateLimit('checkout:global', 600)) ||
        !(await rateLimit('checkout:' + createHash('sha256').update(data.phone).digest('hex'), 5))
      )
        throw new StoreError('Too many checkout attempts. Please wait one minute.', 429);
      const order = await placeOrder(data, key);
      const payment = await gatewayOrder(order);
      return Response.json(
        { ...publicOrder(order), payment },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      return apiError(error);
    }
  }
  if (Number(req.headers.get('content-length') || 0) > 16000)
    return Response.json({ error: 'Request too large' }, { status: 413 });
  try {
    const text = await req.text();
    if (text.length > 16000) return Response.json({ error: 'Request too large' }, { status: 413 });
    const data = schema.parse(JSON.parse(text));
    if (new Set(data.items.map((i) => i.id)).size !== data.items.length)
      return Response.json({ error: 'Duplicate product lines' }, { status: 400 });
    const key = req.headers.get('Idempotency-Key');
    if (!key || !z.string().uuid().safeParse(key).success)
      return Response.json({ error: 'Valid checkout key required' }, { status: 400 });
    if (data.payment !== 'COD')
      return Response.json(
        {
          error:
            'Online payments require a configured gateway. Choose cash on delivery to try the demo.',
        },
        { status: 503 },
      );
    const q = quote(data.items, data.coupon);
    if (q.total > 2500000)
      return Response.json({ error: 'COD orders are limited to ₹25,000' }, { status: 400 });
    const id = 'GG-' + createHash('sha256').update(key).digest('hex').slice(0, 10).toUpperCase();
    return Response.json(
      {
        id,
        total: q.total,
        items: q.lines,
        status: 'PLACED',
        paymentStatus: 'COD_PENDING',
        demo: true,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues.find((issue) => issue.path[0] === 'pincode')?.message ||
              'Please check your contact, address and delivery details'
            : e instanceof SyntaxError
              ? 'Invalid request'
              : e instanceof Error
                ? e.message
                : 'Unable to place order',
      },
      { status: 400 },
    );
  }
}
