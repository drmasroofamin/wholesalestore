import { z } from 'zod';
import { validSignature, sameOrigin, rateLimit } from '@/lib/security';
import { canReadReceipt } from '@/lib/admin-auth';
import { liveMode, StoreError } from '@/lib/live-config';
import { gateway, recordCapture } from '@/lib/live-payments';
import { publicOrder, readOrder } from '@/lib/live-orders';
import { apiError, readJson } from '@/lib/http';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  if (!liveMode())
    return Response.json({ error: 'Live payment processing is not enabled' }, { status: 503 });
  try {
    const data = z
      .object({
        orderId: z.string().max(100),
        gatewayOrderId: z.string().max(100),
        paymentId: z.string().max(100),
        signature: z.string().length(64),
      })
      .parse(await readJson(req));
    if (!canReadReceipt(req, data.orderId)) throw new StoreError('Receipt access is required', 403);
    if (!(await rateLimit('verify:' + data.orderId, 20)))
      throw new StoreError('Please wait before retrying verification', 429);
    const order = await readOrder(data.orderId);
    if (!order || !order.payments.some((p) => p.gatewayOrderId === data.gatewayOrderId))
      throw new StoreError('Payment order mismatch');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new StoreError('Payments are not configured', 503);
    if (!validSignature(`${data.gatewayOrderId}|${data.paymentId}`, data.signature, secret))
      throw new StoreError('Invalid payment signature');
    const payment = await gateway().getPayment(data.paymentId);
    if (
      payment.order_id !== data.gatewayOrderId ||
      payment.amount !== order.total ||
      payment.currency !== 'INR'
    )
      throw new StoreError('Payment details do not match the order');
    const result =
      payment.status === 'captured' ? await recordCapture(payment, 'verify:' + payment.id) : order;
    return Response.json(publicOrder(result), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
