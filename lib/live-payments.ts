import { createHash, randomUUID } from 'node:crypto';
import { database } from './db';
import { RazorpayProvider, assertCaptured } from './payments';
import { StoreError, onlinePaymentsEnabled } from './live-config';
import { redis, cacheKey } from './security';
import { lockOrder, readOrder, releaseOrder, StoredOrder } from './live-orders';
export function gateway() {
  if (!onlinePaymentsEnabled())
    throw new StoreError('Online payments are not configured. Choose cash on delivery.', 503);
  return new RazorpayProvider(
    process.env.RAZORPAY_KEY_ID!,
    process.env.RAZORPAY_KEY_SECRET!,
    process.env.RAZORPAY_WEBHOOK_SECRET!,
  );
}
export async function gatewayOrder(order: StoredOrder) {
  if (!order.method.startsWith('RAZORPAY') || order.paymentStatus === 'PAID') return null;
  if ((order.method === 'RAZORPAY_TEST') !== !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'))
    throw new StoreError('The payment environment changed. Please start a new order.', 410);
  if (order.status === 'CANCELLED' || !order.expiresAt || order.expiresAt <= new Date())
    throw new StoreError('Payment reservation expired. Please place a new order.', 410);
  const key = cacheKey('gateway-create:' + order.id),
    token = randomUUID();
  const cache = redis();
  if ((await cache.set(key, token, 'PX', 30000, 'NX')) !== 'OK')
    throw new StoreError('Payment is being prepared. Please retry in a few seconds.', 409);
  try {
    const db = database();
    const existing = await db.payment.findFirst({ where: { orderId: order.id } });
    if (existing && !existing.gatewayOrderId.startsWith('pending:'))
      return {
        id: existing.gatewayOrderId,
        amount: existing.amount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
      };
    const payment =
      existing ||
      (await db.payment.create({
        data: { orderId: order.id, gatewayOrderId: 'pending:' + order.id, amount: order.total },
      }));
    const created = await gateway().createOrder({ receipt: order.id, amount: order.total });
    await db.payment.update({ where: { id: payment.id }, data: { gatewayOrderId: created.id } });
    return { ...created, key: process.env.RAZORPAY_KEY_ID };
  } finally {
    await cache
      .eval(
        "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
        1,
        key,
        token,
      )
      .catch(() => {});
  }
}
export type CapturedPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};
export async function recordCapture(payment: CapturedPayment, eventId: string) {
  const db = database();
  const saved = await db.payment.findUnique({ where: { gatewayOrderId: payment.order_id } });
  if (!saved) throw new StoreError('Gateway order is not associated with a store order', 404);
  assertCaptured(payment, { orderId: saved.gatewayOrderId, amount: saved.amount });
  await db.$transaction(async (tx) => {
    await lockOrder(tx, saved.orderId);
    if (await tx.paymentTransaction.findUnique({ where: { eventId } })) return;
    const current = await tx.payment.findUniqueOrThrow({ where: { id: saved.id } });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: saved.orderId },
      include: { items: true, history: true, payments: true },
    });
    if (current.gatewayPaymentId && current.gatewayPaymentId !== payment.id) {
      await tx.paymentTransaction.create({
        data: { paymentId: current.id, eventId, type: 'DUPLICATE_CAPTURE_REQUIRES_REVIEW' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: 'Additional payment captured. Check Razorpay and refund the duplicate.',
        },
      });
      return;
    }
    await tx.paymentTransaction.create({
      data: { paymentId: current.id, eventId, type: 'PAYMENT_CAPTURED' },
    });
    if (['PAID', 'REFUNDED', 'PARTIALLY_PAID'].includes(current.status)) return;
    await tx.payment.update({
      where: { id: current.id },
      data: { status: 'PAID', gatewayPaymentId: payment.id },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        expiresAt: null,
        history: {
          create: {
            status: order.status,
            note:
              order.status === 'CANCELLED'
                ? 'Payment captured after cancellation. Refund required in Razorpay.'
                : 'Online payment captured and amount verified',
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: 'razorpay',
        action: order.status === 'CANCELLED' ? 'LATE_CAPTURE_REFUND_REQUIRED' : 'PAYMENT_CAPTURED',
        targetId: order.id,
        metadata: { paymentId: payment.id },
      },
    });
  });
  return (await readOrder(saved.orderId))!;
}
export async function processWebhook(raw: string) {
  const body = JSON.parse(raw);
  const eventId = 'webhook:' + createHash('sha256').update(raw).digest('hex');
  if (body.event === 'payment.captured') {
    const p = body.payload?.payment?.entity;
    if (
      !p ||
      typeof p.id !== 'string' ||
      typeof p.order_id !== 'string' ||
      !Number.isSafeInteger(p.amount)
    )
      throw new StoreError('Invalid captured-payment event');
    await recordCapture(p, eventId);
    return;
  }
  if (body.event === 'payment.failed') {
    const p = body.payload?.payment?.entity;
    if (!p?.order_id) throw new StoreError('Invalid failed-payment event');
    const saved = await database().payment.findUnique({ where: { gatewayOrderId: p.order_id } });
    if (!saved) return;
    await database().$transaction(async (tx) => {
      await lockOrder(tx, saved.orderId);
      if (await tx.paymentTransaction.findUnique({ where: { eventId } })) return;
      await tx.paymentTransaction.create({
        data: { paymentId: saved.id, eventId, type: 'PAYMENT_FAILED' },
      });
      await tx.payment.updateMany({
        where: { id: saved.id, status: { in: ['PENDING', 'AUTHORIZED', 'FAILED'] } },
        data: { status: 'FAILED' },
      });
      await tx.order.updateMany({
        where: { id: saved.orderId, paymentStatus: { in: ['PENDING', 'AUTHORIZED', 'FAILED'] } },
        data: { paymentStatus: 'FAILED' },
      });
    });
    return;
  }
  if (body.event === 'refund.processed') {
    const refund = body.payload?.refund?.entity;
    if (
      !refund?.id ||
      !refund.payment_id ||
      !Number.isSafeInteger(refund.amount) ||
      refund.amount <= 0
    )
      throw new StoreError('Invalid refund event');
    const saved = await database().payment.findUnique({
      where: { gatewayPaymentId: refund.payment_id },
    });
    if (!saved) throw new StoreError('Unknown refunded payment', 404);
    await database().$transaction(async (tx) => {
      await lockOrder(tx, saved.orderId);
      if (await tx.paymentTransaction.findUnique({ where: { eventId } })) return;
      await tx.paymentTransaction.create({
        data: { paymentId: saved.id, eventId, type: 'REFUND_PROCESSED' },
      });
      await tx.refund.upsert({
        where: { gatewayId: refund.id },
        create: {
          paymentId: saved.id,
          gatewayId: refund.id,
          amount: refund.amount,
          status: 'PROCESSED',
          reason: 'Refund confirmed by Razorpay',
        },
        update: { status: 'PROCESSED' },
      });
      const all = await tx.refund.aggregate({
        where: { paymentId: saved.id, status: 'PROCESSED' },
        _sum: { amount: true },
      });
      const total = all._sum.amount || 0;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: saved.orderId },
        include: { items: true, history: true, payments: true },
      });
      if (total >= saved.amount && ['PLACED', 'CONFIRMED'].includes(order.status))
        await releaseOrder(tx, order, 'Full refund confirmed');
      const status = total >= saved.amount ? 'REFUNDED' : 'PARTIALLY_PAID';
      await tx.payment.update({ where: { id: saved.id }, data: { status } });
      await tx.order.update({ where: { id: saved.orderId }, data: { paymentStatus: status } });
    });
  }
}
