import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STORE_NAME, liveSettings, storeName } from '../lib/live-config';

test('store name uses STORE_NAME and falls back to zebastore', () => {
  const previous = process.env.STORE_NAME;
  try {
    delete process.env.STORE_NAME;
    assert.equal(storeName(), DEFAULT_STORE_NAME);
    process.env.STORE_NAME = '  Custom Store  ';
    assert.equal(storeName(), 'Custom Store');
    process.env.STORE_NAME = '   ';
    assert.equal(storeName(), DEFAULT_STORE_NAME);
  } finally {
    if (previous === undefined) delete process.env.STORE_NAME;
    else process.env.STORE_NAME = previous;
  }
});

test('store name prefers liveSettings().name when the server is configured', () => {
  const keys = [
    'APP_ORIGIN',
    'STORE_NAME',
    'STORE_PHONE',
    'DATABASE_URL',
    'REDIS_URL',
    'SESSION_SECRET',
    'ADMIN_PASSWORD_HASH',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.APP_ORIGIN = 'http://127.0.0.1:3000';
    process.env.STORE_NAME = '  Live Market  ';
    process.env.STORE_PHONE = '+911234567890';
    process.env.DATABASE_URL ||= 'postgresql://localhost/unused';
    process.env.REDIS_URL ||= 'redis://localhost:6379';
    process.env.SESSION_SECRET = 's'.repeat(32);
    process.env.ADMIN_PASSWORD_HASH = 'hash';
    assert.equal(storeName(), liveSettings().name);
    assert.equal(storeName(), 'Live Market');
    process.env.SESSION_SECRET = 'short';
    assert.equal(storeName(), 'Live Market');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
