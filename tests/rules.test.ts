import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  priceFor,
  creditAllowed,
  splitTax,
  quote,
  deliveryCharge,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_FREE_DELIVERY_ABOVE,
} from '../lib/rules';
import { validSignature } from '../lib/security';
import { POST } from '../app/api/orders/route';
test('household, bulk, and 50+ tier boundaries', () => {
  assert.equal(priceFor(10, false, 10000, 9000), 10000);
  assert.equal(priceFor(9, true, 10000, 9000), 10000);
  assert.equal(priceFor(10, true, 10000, 9000), 9000);
  assert.equal(priceFor(50, true, 10000, 9000), 8640);
  assert.throws(() => priceFor(1.5, true, 100, 90));
});
test('credit blocks overdue and exceeded limits', () => {
  assert.equal(creditAllowed(10000, 50000, 40000, false), true);
  assert.equal(creditAllowed(10001, 50000, 40000, false), false);
  assert.equal(creditAllowed(1, 50000, 0, true), false);
});
test('tax split conserves integer paise for odd amounts and interstate', () => {
  const s = splitTax(12345, 5);
  assert.equal(s.cgst + s.sgst, s.tax);
  assert.equal(s.igst, 0);
  assert.equal(splitTax(10500, 5, true).igst, 500);
});
test('quote recalculates from trusted catalogue and respects stock', () => {
  const q = quote([{ id: 'basmati', quantity: 2 }], 'WELCOME10');
  assert.equal(q.subtotal, 129800);
  assert.equal(q.discount, 10000);
  assert.equal(q.delivery, 0);
  assert.equal(q.total, 119800);
  assert.throws(() => quote([{ id: 'basmati', quantity: 121 }]));
  assert.throws(() => quote([{ id: 'unknown', quantity: 1 }]));
});
test('a five-rupee biscuit pays ₹25, and delivery is free at exactly ₹500', () => {
  const q = quote([{ id: 'biscuit', quantity: 1 }]);
  assert.equal(q.subtotal, 500);
  assert.equal(q.discount, 0);
  assert.equal(q.delivery, 2500);
  assert.equal(q.total, 3000);
  assert.equal(q.lines[0].gst, 18);
  const exact = quote([{ id: 'biscuit', quantity: 100 }]);
  assert.equal(exact.subtotal, 50000);
  assert.equal(exact.delivery, 0);
  assert.equal(exact.total, 50000);
  const below = quote([{ id: 'biscuit', quantity: 99 }]);
  assert.equal(below.subtotal, 49500);
  assert.equal(below.delivery, 2500);
  assert.equal(
    deliveryCharge(DEFAULT_FREE_DELIVERY_ABOVE, DEFAULT_FREE_DELIVERY_ABOVE, DEFAULT_DELIVERY_FEE),
    0,
  );
  assert.equal(
    deliveryCharge(
      DEFAULT_FREE_DELIVERY_ABOVE - 1,
      DEFAULT_FREE_DELIVERY_ABOVE,
      DEFAULT_DELIVERY_FEE,
    ),
    2500,
  );
});
test('signatures reject tampering and malformed lengths', () => {
  const body = 'order_1|payment_1',
    signature = createHmac('sha256', 'secret').update(body).digest('hex');
  assert(validSignature(body, signature, 'secret'));
  assert(!validSignature(body + 'x', signature, 'secret'));
  assert(!validSignature(body, 'bad', 'secret'));
});
const payload = {
  items: [{ id: 'basmati', quantity: 1 }],
  name: 'Test Customer',
  phone: '9876543210',
  address: '12 Test Street, Srinagar',
  pincode: '190001',
  slot: 'Today, 4 PM – 7 PM',
  payment: 'COD',
  coupon: '',
};
function request(body: unknown = payload, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'Idempotency-Key': 'a5104f0a-7d52-4d5e-a666-96016fd37603',
    },
    body: JSON.stringify(body),
  });
}
test('demo checkout validates and returns consistent receipt without charging', async () => {
  const a = await POST(request()),
    b = await POST(request());
  assert.equal(a.status, 201);
  const aj = await a.json(),
    bj = await b.json();
  assert.equal(aj.id, bj.id);
  assert.equal(aj.total, 64900);
  assert.equal(aj.demo, true);
  assert.equal(aj.paymentStatus, 'COD_PENDING');
});
test('checkout rejects duplicate lines, invalid pincodes and unconfigured online payments', async () => {
  assert.equal(
    (await POST(request({ ...payload, items: [...payload.items, ...payload.items] }))).status,
    400,
  );
  assert.equal((await POST(request({ ...payload, pincode: '012345' }))).status, 400);
  assert.equal((await POST(request({ ...payload, payment: 'UPI' }))).status, 503);
  assert.equal((await POST(request(payload, 'https://untrusted.example'))).status, 403);
});
test('live mode fails closed instead of creating fictitious paid orders', async () => {
  process.env.DEMO_MODE = 'false';
  try {
    assert.equal((await POST(request())).status, 503);
  } finally {
    delete process.env.DEMO_MODE;
  }
});

test('provider validates gateway amounts and captured state', async () => {
  const { RazorpayProvider, assertCaptured } = await import('../lib/payments');
  const transport = async () => Response.json({ id: 'order_123', amount: 10000, currency: 'INR' });
  const provider = new RazorpayProvider('test', 'secret', 'webhook', transport);
  assert.equal((await provider.createOrder({ receipt: 'GG-1', amount: 10000 })).id, 'order_123');
  await assert.rejects(() => provider.createOrder({ receipt: 'GG-1', amount: 12000 }));
  assert.doesNotThrow(() =>
    assertCaptured(
      { order_id: 'order_123', amount: 10000, currency: 'INR', status: 'captured' },
      { orderId: 'order_123', amount: 10000 },
    ),
  );
  assert.throws(() =>
    assertCaptured(
      { order_id: 'order_123', amount: 10000, currency: 'INR', status: 'authorized' },
      { orderId: 'order_123', amount: 10000 },
    ),
  );
});

test('demo checkout accepts 192210 and distinguishes invalid pincode formats', async () => {
  assert.equal((await POST(request({ ...payload, pincode: '192210' }))).status, 201);
  assert.equal((await POST(request({ ...payload, pincode: '110001' }))).status, 201);
  for (const pincode of ['19221', '1922100', '000000', '19A210']) {
    const response = await POST(request({ ...payload, pincode }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /six-digit Indian pincode/);
  }
});
