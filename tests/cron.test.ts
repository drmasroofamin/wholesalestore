import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/internal/slots/route';
test('delivery slot cron rejects a missing or wrong bearer secret', async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const missing = await GET(new Request('http://localhost/api/internal/slots'));
    assert.equal(missing.status, 401);
    process.env.CRON_SECRET = 'test-cron-secret';
    const wrong = await GET(
      new Request('http://localhost/api/internal/slots', {
        headers: { authorization: 'Bearer other-secret' },
      }),
    );
    assert.equal(wrong.status, 401);
    const malformed = await GET(
      new Request('http://localhost/api/internal/slots', {
        headers: { authorization: 'test-cron-secret' },
      }),
    );
    assert.equal(malformed.status, 401);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
