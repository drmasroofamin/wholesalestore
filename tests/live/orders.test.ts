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

// Account tests use the same isolated database and sequential setup as checkout tests.
import {
  createVerifiedCustomerSession,
  customerFromToken,
  revokeCustomerSession,
  sessionHash,
} from '../../lib/customer-auth';
import { saveProfile, saveAddress, removeAddress } from '../../lib/customer-profile';
import { customerOrders, ownedOrder } from '../../lib/customer-orders';
import { requestOtp, verifyOtp } from '../../lib/customer-otp';
import { POST as requestCode } from '../../app/api/customer/otp/request/route';
import { POST as verifyCode } from '../../app/api/customer/otp/verify/route';
import { GET as accountHistory } from '../../app/api/customer/orders/route';
import { PUT as updateProfile } from '../../app/api/customer/profile/route';
import { POST as claimReceipt } from '../../app/api/customer/orders/claim/route';
import { DELETE as deleteAddress } from '../../app/api/customer/addresses/[id]/route';
import { GET as receiptDetails } from '../../app/api/orders/[id]/route';
const testPhone = () => '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
const testAddress = {
  label: 'Home' as const,
  line: 'Test house near main market, Anantnag',
  pincode: '192210',
  isDefault: true,
};
function accountRequest(
  path: string,
  token = '',
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return new Request('http://localhost:3000/api/customer/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Origin: 'http://localhost:3000',
      Cookie: 'gg-customer=' + token,
      'Content-Type': 'application/json',
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test('verified profiles and saved addresses survive a new session; expired and revoked sessions fail', async () => {
  const phone = testPhone();
  const first = await createVerifiedCustomerSession(phone);
  assert.equal(first.customer.needsProfile, true);
  const saved = await saveProfile(first.customer.id, {
    name: 'Saved Customer',
    address: testAddress,
  });
  assert.equal(saved.needsProfile, false);
  assert.equal(saved.addresses[0].pincode, '192210');
  const two = await createVerifiedCustomerSession(phone);
  assert.equal(two.customer.id, first.customer.id);
  assert.equal(two.customer.name, 'Saved Customer');
  assert.equal(two.customer.addresses[0].line, testAddress.line);
  const hashed = await db.customerSession.findUniqueOrThrow({
    where: { tokenHash: sessionHash(first.token) },
  });
  assert.notEqual(hashed.tokenHash, first.token);
  await revokeCustomerSession(first.token);
  assert.equal(await customerFromToken(first.token), null);
  assert.ok(await customerFromToken(two.token));
  await db.customerSession.update({
    where: { tokenHash: sessionHash(two.token) },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await customerFromToken(two.token), null);
});
test('addresses and order history are isolated by verified account, including idempotency retries', async () => {
  const a = await createVerifiedCustomerSession(testPhone()),
    b = await createVerifiedCustomerSession(testPhone());
  const saved = await saveProfile(a.customer.id, { name: 'Customer A', address: testAddress });
  const address = saved.addresses[0];
  await assert.rejects(
    () => saveAddress(b.customer.id, { ...testAddress, id: address.id }),
    /Address not found/,
  );
  await assert.rejects(() => removeAddress(b.customer.id, address.id), /Address not found/);
  const key = randomUUID();
  const order = await placeOrder({ ...data, phone: a.customer.phone }, key, db, a.customer.id);
  await assert.rejects(
    () => placeOrder({ ...data, phone: a.customer.phone }, key, db, b.customer.id),
    /different order/,
  );
  assert.equal((await customerOrders(a.customer.id)).orders[0].id, order.id);
  assert.equal((await customerOrders(b.customer.id)).orders.length, 0);
  await assert.rejects(() => ownedOrder(b.customer.id, order.id), /Order not found/);
  const second = await saveAddress(a.customer.id, {
    ...testAddress,
    line: 'Second test-only home in Anantnag',
  });
  assert.equal(second.addresses.filter((a) => a.isDefault).length, 1);
  await removeAddress(a.customer.id, second.addresses.find((a) => a.isDefault)!.id);
  assert.equal((await customerFromToken(a.token))?.addresses[0].isDefault, true);
});
test('OTP challenges reject wrong codes, limit attempts, expire and cannot be replayed', async () => {
  const phone = testPhone();
  let sends = 0;
  const provider = {
    send: async () => {
      sends++;
      return 'VEtest';
    },
    verify: async (_p: string, _id: string, code: string) => code === '123456',
  };
  const challenge = await requestOtp(phone, 'test-ip-' + randomUUID(), provider);
  assert.equal(sends, 1);
  await assert.rejects(() => requestOtp(phone, 'test-ip', provider), /wait 60/);
  for (let i = 0; i < 5; i++)
    await assert.rejects(() => verifyOtp(challenge.challengeId, '000000', provider), /Incorrect/);
  await assert.rejects(() => verifyOtp(challenge.challengeId, '123456', provider), /expired/);
  const correct = await requestOtp(testPhone(), 'test-ip-' + randomUUID(), provider);
  assert.match(await verifyOtp(correct.challengeId, '123456', provider), /^9/);
  await assert.rejects(() => verifyOtp(correct.challengeId, '123456', provider), /expired/);
  const expired = await requestOtp(testPhone(), 'test-ip-' + randomUUID(), provider);
  const { cacheKey } = await import('../../lib/security');
  await redis().expire(cacheKey('customer-otp:challenge:' + expired.challengeId), 0);
  await assert.rejects(() => verifyOtp(expired.challengeId, '123456', provider), /expired/);
});
test('real OTP routes use provider approval, issue an HttpOnly cookie and never accept a fixed test code', async () => {
  process.env.CUSTOMER_ACCOUNTS_ENABLED = 'true';
  process.env.OTP_PROVIDER = 'twilio';
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'test-only';
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VAtest';
  const transport = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.ok(url.startsWith('https://verify.twilio.com/v2/Services/VAtest/'));
    assert.match((init?.headers && JSON.stringify(init.headers)) || '', /Basic/);
    calls++;
    return Response.json(
      url.endsWith('/Verifications')
        ? { sid: 'VEtest' }
        : { status: String(init?.body).includes('Code=123456') ? 'approved' : 'pending' },
    );
  };
  try {
    const sent = await requestCode(accountRequest('otp/request', '', { phone: testPhone() }));
    assert.equal(sent.status, 200);
    const challenge = await sent.json();
    const rejected = await verifyCode(
      accountRequest('otp/verify', '', { challengeId: challenge.challengeId, code: '111111' }),
    );
    assert.equal(rejected.status, 400);
    assert.equal(rejected.headers.get('set-cookie'), null);
    const approved = await verifyCode(
      accountRequest('otp/verify', '', { challengeId: challenge.challengeId, code: '123456' }),
    );
    assert.equal(approved.status, 200);
    const cookie = approved.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.doesNotMatch(cookie, /Secure/i);
    assert.equal((await approved.json()).customer.needsProfile, true);
    const replay = await verifyCode(
      accountRequest('otp/verify', '', { challengeId: challenge.challengeId, code: '123456' }),
    );
    assert.equal(replay.status, 400);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = transport;
    delete process.env.CUSTOMER_ACCOUNTS_ENABLED;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  }
});
test('signed-in checkout uses owned saved details; anonymous and other-account requests cannot access them', async () => {
  process.env.CUSTOMER_ACCOUNTS_ENABLED = 'true';
  try {
    const a = await createVerifiedCustomerSession(testPhone()),
      b = await createVerifiedCustomerSession(testPhone());
    const saved = await saveProfile(a.customer.id, {
      name: 'Canonical Customer',
      address: testAddress,
    });
    await saveProfile(b.customer.id, {
      name: 'Other Customer',
      address: { ...testAddress, line: 'Other customer test address, Anantnag' },
    });
    const send = async (token: string, fields: unknown, key = randomUUID()) =>
      checkout(
        new Request('http://localhost:3000/api/orders', {
          method: 'POST',
          headers: {
            Cookie: 'gg-customer=' + token,
            Origin: 'http://localhost:3000',
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
          },
          body: JSON.stringify(fields),
        }),
      );
    assert.equal((await send('', data)).status, 401);
    assert.equal((await send(b.token, { ...data, addressId: saved.addresses[0].id })).status, 400);
    const placed = await send(a.token, {
      ...data,
      name: 'Forged Name',
      phone: '9999999999',
      address: 'Forged fake address',
      addressId: saved.addresses[0].id,
    });
    assert.equal(placed.status, 201);
    const receipt = await placed.json();
    const order = await readOrder(receipt.id);
    assert.equal(order?.userId, a.customer.id);
    assert.equal(order?.phone, a.customer.phone);
    assert.equal(order?.customerName, 'Canonical Customer');
    assert.equal(order?.address, testAddress.line);
    assert.equal((await accountHistory(accountRequest('orders'))).status, 401);
    const own = await accountHistory(accountRequest('orders', a.token));
    assert.equal((await own.json()).orders[0].id, receipt.id);
    const other = await accountHistory(accountRequest('orders', b.token));
    assert.equal((await other.json()).orders.length, 0);
    const denied = await deleteAddress(
      new Request('http://localhost:3000/api/customer/addresses/x', {
        method: 'DELETE',
        headers: { Cookie: 'gg-customer=' + b.token, Origin: 'http://localhost:3000' },
      }),
      { params: Promise.resolve({ id: saved.addresses[0].id }) },
    );
    assert.equal(denied.status, 404);
    const csrf = await updateProfile(
      new Request('http://localhost:3000/api/customer/profile', {
        method: 'PUT',
        headers: { Origin: 'https://elsewhere.example', Cookie: 'gg-customer=' + a.token },
        body: JSON.stringify({ name: 'Hacked', address: testAddress }),
      }),
    );
    assert.equal(csrf.status, 403);
    // Owners can still view older receipts after the 30-day guest capability has expired.
    await db.order.update({
      where: { id: receipt.id },
      data: { createdAt: new Date(Date.now() - 40 * 86400000) },
    });
    assert.equal(
      (
        await receiptDetails(accountRequest('orders', a.token), {
          params: Promise.resolve({ id: receipt.id }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await receiptDetails(accountRequest('orders', b.token), {
          params: Promise.resolve({ id: receipt.id }),
        })
      ).status,
      404,
    );
  } finally {
    delete process.env.CUSTOMER_ACCOUNTS_ENABLED;
  }
});
test('old guest orders require both a private receipt and matching verified phone to link', async () => {
  process.env.CUSTOMER_ACCOUNTS_ENABLED = 'true';
  try {
    const a = await createVerifiedCustomerSession(data.phone);
    const b = await createVerifiedCustomerSession(testPhone());
    const guest = await placeOrder(data, randomUUID());
    const receipt = publicOrder(guest);
    assert.equal(
      (await customerOrders(a.customer.id)).orders.some((o) => o.id === guest.id),
      false,
    );
    assert.equal(
      (await claimReceipt(accountRequest('orders/claim', a.token, { id: guest.id }))).status,
      403,
    );
    assert.equal(
      (
        await claimReceipt(
          accountRequest(
            'orders/claim',
            b.token,
            { id: guest.id },
            { Authorization: 'Bearer ' + receipt.receiptToken },
          ),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await claimReceipt(
          accountRequest(
            'orders/claim',
            a.token,
            { id: guest.id },
            { Authorization: 'Bearer ' + receipt.receiptToken },
          ),
        )
      ).status,
      200,
    );
    assert.equal((await customerOrders(a.customer.id)).orders[0].id, guest.id);
  } finally {
    delete process.env.CUSTOMER_ACCOUNTS_ENABLED;
  }
});
