import test from 'node:test';
import assert from 'node:assert/strict';
import { safeFailureCode, REQUIRED_STORE_VARIABLES } from '../lib/readiness';
import { GET } from '../app/api/health/route';
import { quote } from '../lib/rules';
import { products } from '../lib/catalog';
test('diagnostic codes do not expose connection URLs or passwords', () => {
  assert.equal(
    safeFailureCode(new Error('postgresql://private-user:private-password@private-host/database')),
    'CONNECTION_FAILED',
  );
  assert.equal(
    safeFailureCode({ code: 'ECONNREFUSED', message: 'private-password' }),
    'ECONNREFUSED',
  );
  assert.equal(safeFailureCode(new Error('WRONGPASS private-password')), 'AUTHENTICATION_FAILED');
  assert.equal(
    safeFailureCode({ code: 'redis://private-password@private-host' }),
    'CONNECTION_FAILED',
  );
});
test('health identifies missing settings separately from missing database and Redis', async () => {
  const names = [...REQUIRED_STORE_VARIABLES, 'DEMO_MODE'] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of REQUIRED_STORE_VARIABLES) delete process.env[name];
    process.env.DEMO_MODE = 'false';
    const response = await GET();
    const result = await response.json();
    assert.equal(response.status, 503);
    assert.equal(result.ready, false);
    assert.equal(result.acceptingOrders, false);
    assert.deepEqual(result.checks.configuration, { ok: false, code: 'MISSING_SETTINGS' });
    assert.deepEqual(result.checks.database, { ok: false, code: 'NOT_CONFIGURED' });
    assert.deepEqual(result.checks.redis, { ok: false, code: 'NOT_CONFIGURED' });
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
test('cart estimate can show the known price for unavailable stock while checkout validation still rejects it', () => {
  const product = { ...products[0], stock: 0 };
  assert.throws(
    () => quote([{ id: product.id, quantity: 1 }], '', [product]),
    /insufficient stock/,
  );
  const estimate = quote([{ id: product.id, quantity: 1 }], '', [product], { checkStock: false });
  assert.equal(estimate.subtotal, product.price);
  assert(estimate.total > 0);
});
