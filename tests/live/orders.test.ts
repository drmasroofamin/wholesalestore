import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { database } from '../../lib/db';
import {
  placeOrder,
  readOrder,
  publicOrder,
  changeOrderStatus,
  expireOrders,
} from '../../lib/live-orders';
import { recordCapture, processWebhook } from '../../lib/live-payments';
import { adminToken, validAdmin, readToken, signToken, checkPassword } from '../../lib/admin-auth';
import { redis } from '../../lib/security';
import { OrderInput } from '../../lib/order-input';
import { POST as checkout } from '../../app/api/orders/route';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes('test'))
  throw new Error('Use a dedicated TEST_DATABASE_URL whose database name contains test');
process.env.DATABASE_URL = url;
process.env.DEMO_MODE = 'false';
process.env.ACCEPT_ORDERS = 'true';
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.SESSION_SECRET = randomBytes(32).toString('hex');
process.env.STORE_NAME = 'Integration Test Store';
process.env.STORE_PHONE = '9999999999';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const salt = randomBytes(16);
const password = 'test-only-password-' + randomUUID();
process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
const db = database();
const data: OrderInput = {
  items: [{ id: 'integration-rice', quantity: 2 }],
  name: 'Integration Customer',
  phone: '9999999999',
  address: 'Test-only address, Anantnag',
  pincode: '192210',
  slot: 'integration-slot',
  payment: 'COD',
  coupon: '',
  expectedTotal: 20000,
};
before(async () => {
  await db.$queryRaw`SELECT 1`;
});
beforeEach(async () => {
  // This suite refuses non-test database names above. No production data is used.
  await db.$executeRawUnsafe(
    'TRUNCATE "PaymentTransaction","Refund","Payment","OrderStatusHistory","OrderItem","Order","StockMovement","AuditLog","DeliverySlot","DeliveryZone","ProductVariant","Product","Category" CASCADE',
  );
  await db.category.create({ data: { id: 'integration-category', name: 'Rice' } });
  await db.product.create({
    data: {
      id: 'integration-rice',
      name: 'Integration Rice',
      hindi: 'चावल',
      categoryId: 'integration-category',
      image: '/products/rice.webp',
      hsn: '1006',
      gst: 5,
      variants: {
        create: {
          id: 'integration-rice-default',
          pack: '1 kg',
          price: 10000,
          mrp: 12000,
          stock: 5,
        },
      },
    },
  });
  await db.deliveryZone.create({
    data: { pincode: '192210', fee: 0, freeAbove: 99900, codLimit: 1000000 },
  });
  await db.deliverySlot.create({
    data: {
      id: 'integration-slot',
      startsAt: new Date(Date.now() + 7200000),
      endsAt: new Date(Date.now() + 10800000),
      cutoffAt: new Date(Date.now() + 3600000),
      capacity: 20,
    },
  });
});
after(async () => {
  await db.$disconnect();
  await redis().quit();
});
test('persists a real COD order and returns no contact/address data in the receipt', async () => {
  const order = await placeOrder(data, randomUUID());
  assert.equal(order.customerName, data.name);
  assert.equal(order.phone, data.phone);
  assert.equal(order.items.length, 1);
  assert.equal(order.paymentStatus, 'COD_PENDING');
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    2,
  );
  const receipt = publicOrder(order);
  assert.equal(receipt.demo, false);
  assert.equal('phone' in receipt, false);
  assert.equal('address' in receipt, false);
  assert.equal(readToken(receipt.receiptToken, 'receipt')?.id, order.id);
});
test('concurrent duplicate submissions reserve inventory and a slot exactly once', async () => {
  const key = randomUUID();
  const results = await Promise.all([placeOrder(data, key), placeOrder(data, key)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(await db.order.count(), 1);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    2,
  );
  assert.equal((await db.deliverySlot.findUniqueOrThrow({ where: { id: data.slot } })).booked, 1);
  await assert.rejects(
    () => placeOrder({ ...data, name: 'Changed request' }, key),
    /different order/,
  );
});
test('concurrent orders cannot oversell the last stock', async () => {
  const input = { ...data, items: [{ id: 'integration-rice', quantity: 4 }], expectedTotal: 40000 };
  const results = await Promise.allSettled([
    placeOrder(input, randomUUID()),
    placeOrder(input, randomUUID()),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await db.order.count(), 1);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    4,
  );
  assert.equal((await db.deliverySlot.findUniqueOrThrow({ where: { id: data.slot } })).booked, 1);
});
test('delivery zone, authoritative price and capacity failures roll back all writes', async () => {
  await assert.rejects(
    () => placeOrder({ ...data, pincode: '110001' }, randomUUID()),
    /delivery is not/,
  );
  await assert.rejects(
    () => placeOrder({ ...data, expectedTotal: 1 }, randomUUID()),
    /Prices or delivery fees/,
  );
  await db.deliverySlot.update({ where: { id: data.slot }, data: { capacity: 0 } });
  await assert.rejects(() => placeOrder(data, randomUUID()), /slot is no longer/);
  assert.equal(await db.order.count(), 0);
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    0,
  );
});
test('cancelling before packing releases stock and slot capacity once', async () => {
  const order = await placeOrder(data, randomUUID());
  await changeOrderStatus(order.id, 'CONFIRMED');
  await changeOrderStatus(order.id, 'CANCELLED');
  await changeOrderStatus(order.id, 'CANCELLED');
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    0,
  );
  assert.equal((await db.deliverySlot.findUniqueOrThrow({ where: { id: data.slot } })).booked, 0);
});
test('free delivery includes an order whose subtotal equals the zone threshold', async () => {
  await db.deliveryZone.update({
    where: { pincode: '192210' },
    data: { fee: 2500, freeAbove: 20000, codLimit: 500000 },
  });
  const free = await placeOrder(data, randomUUID());
  assert.equal(free.subtotal, 20000);
  assert.equal(free.deliveryFee, 0);
  assert.equal(free.total, 20000);
  const paid = await placeOrder(
    {
      ...data,
      items: [{ id: 'integration-rice', quantity: 1 }],
      phone: '9999999993',
      expectedTotal: 12500,
    },
    randomUUID(),
  );
  assert.equal(paid.subtotal, 10000);
  assert.equal(paid.deliveryFee, 2500);
  assert.equal(paid.total, 12500);
});
test('COD fulfilment enforces transitions and explicit cash collection', async () => {
  const order = await placeOrder(data, randomUUID());
  await assert.rejects(() => changeOrderStatus(order.id, 'DELIVERED', true), /not allowed/);
  for (const status of ['CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY'] as const)
    await changeOrderStatus(order.id, status);
  await assert.rejects(() => changeOrderStatus(order.id, 'DELIVERED'), /full COD amount/);
  const delivered = await changeOrderStatus(order.id, 'DELIVERED', true);
  assert.equal(delivered.paymentStatus, 'COD_COLLECTED');
  const stock = await db.productVariant.findUniqueOrThrow({
    where: { id: 'integration-rice-default' },
  });
  assert.equal(stock.stock, 3);
  assert.equal(stock.reserved, 0);
});
async function pendingOnline() {
  const order = await placeOrder({ ...data, payment: 'UPI' }, randomUUID());
  await db.payment.create({
    data: { orderId: order.id, gatewayOrderId: 'order_test123', amount: order.total },
  });
  return order;
}
const captured = {
  id: 'pay_test123',
  order_id: 'order_test123',
  amount: 20000,
  currency: 'INR',
  status: 'captured',
};
test('capture replay is idempotent and a late failed event cannot undo paid status', async () => {
  const order = await pendingOnline();
  await Promise.all([
    recordCapture(captured, 'event-capture'),
    recordCapture(captured, 'event-capture'),
  ]);
  await processWebhook(
    JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: captured } } }),
  );
  const saved = (await readOrder(order.id))!;
  assert.equal(saved.paymentStatus, 'PAID');
  assert.equal(saved.payments[0].gatewayPaymentId, captured.id);
  assert.equal(await db.paymentTransaction.count({ where: { eventId: 'event-capture' } }), 1);
  assert.equal(saved.expiresAt, null);
});
test('wrong-amount captures never mark an order paid', async () => {
  const order = await pendingOnline();
  await assert.rejects(() => recordCapture({ ...captured, amount: 1 }, 'bad-amount'));
  assert.equal((await readOrder(order.id))!.paymentStatus, 'PENDING');
  assert.equal(await db.paymentTransaction.count(), 0);
});
test('unpaid online expiry frees stock; a late capture is saved for refund review', async () => {
  const order = await pendingOnline();
  await db.order.update({
    where: { id: order.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await expireOrders(), 1);
  assert.equal(await expireOrders(), 0);
  await recordCapture(captured, 'late-capture');
  const saved = (await readOrder(order.id))!;
  assert.equal(saved.status, 'CANCELLED');
  assert.equal(saved.paymentStatus, 'PAID');
  assert(saved.history.some((h) => h.note?.includes('Refund required')));
  assert.equal(
    (await db.productVariant.findUniqueOrThrow({ where: { id: 'integration-rice-default' } }))
      .reserved,
    0,
  );
});
test('refund webhooks are durable, idempotent and release unfulfilled stock', async () => {
  const order = await pendingOnline();
  await recordCapture(captured, 'event-capture');
  const event = JSON.stringify({
    event: 'refund.processed',
    payload: { refund: { entity: { id: 'rfnd_test123', payment_id: captured.id, amount: 20000 } } },
  });
  await processWebhook(event);
  await processWebhook(event);
  const saved = (await readOrder(order.id))!;
  assert.equal(saved.paymentStatus, 'REFUNDED');
  assert.equal(saved.status, 'CANCELLED');
  assert.equal(await db.refund.count(), 1);
});
test('admin password/session checks reject tampering, expiry and wrong-purpose tokens', () => {
  assert(checkPassword(password));
  assert(!checkPassword(password + 'x'));
  const token = adminToken();
  assert(validAdmin(token));
  assert(!validAdmin(token + 'x'));
  assert(!validAdmin(signToken('admin', { version: 'wrong' }, Date.now() + 60000)));
  assert(!readToken(signToken('receipt', { id: 'x' }, Date.now() - 1), 'receipt'));
  assert(!readToken(token, 'receipt'));
});
test('live API persists COD and reuses a single gateway order across retry', async () => {
  function req(body: unknown, key: string) {
    return new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    });
  }
  const cod = await checkout(req({ ...data, phone: '9999999991' }, randomUUID()));
  assert.equal(cod.status, 201);
  assert.equal((await cod.json()).demo, false);
  process.env.RAZORPAY_KEY_ID = 'rzp_test_integration';
  process.env.RAZORPAY_KEY_SECRET = 'test-only-secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-only-webhook';
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.razorpay.com/v1/orders');
    calls++;
    const body = JSON.parse(String(options?.body));
    return Response.json({ id: 'order_apiIntegration', amount: body.amount, currency: 'INR' });
  };
  try {
    const key = randomUUID(),
      body = { ...data, phone: '9999999992', payment: 'UPI' };
    const a = await checkout(req(body, key)),
      b = await checkout(req(body, key));
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(calls, 1);
    const aa = await a.json(),
      bb = await b.json();
    assert.equal(aa.id, bb.id);
    assert.equal(aa.payment.id, 'order_apiIntegration');
    assert.equal(aa.payment.key, 'rzp_test_integration');
    assert.equal('secret' in aa.payment, false);
  } finally {
    globalThis.fetch = original;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  }
});

test('store returns free slots beyond the first 30 full slots and bypasses cache on refresh', async () => {
  await db.deliverySlot.deleteMany();
  const base = Date.now() + 7200000;
  await db.deliverySlot.createMany({
    data: Array.from({ length: 31 }, (_, i) => ({
      id: 'full-slot-' + i,
      startsAt: new Date(base + i * 3600000),
      endsAt: new Date(base + (i + 1) * 3600000),
      cutoffAt: new Date(base + i * 3600000 - 3600000),
      capacity: 1,
      booked: 1,
    })),
  });
  await db.deliverySlot.create({
    data: {
      id: 'available-after-full-slots',
      startsAt: new Date(base + 32 * 3600000),
      endsAt: new Date(base + 33 * 3600000),
      cutoffAt: new Date(base + 31 * 3600000),
      capacity: 2,
      booked: 0,
    },
  });
  const { GET } = await import('../../app/api/store/route');
  const response = await GET(new Request('http://localhost:3000/api/store?refresh=1'));
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.deepEqual(
    config.slots.map((s: { id: string }) => s.id),
    ['available-after-full-slots'],
  );
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
