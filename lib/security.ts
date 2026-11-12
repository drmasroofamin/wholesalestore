import Redis from 'ioredis';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
const g = globalThis as unknown as { redis?: Redis };
export function redis() {
  if (!process.env.REDIS_URL) throw new Error('Shared rate limiting is not configured');
  return (
    (g.redis?.status === 'end' ? undefined : g.redis) ??
    (g.redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: (attempt) => (attempt <= 2 ? attempt * 100 : null),
    }).on('error', () => {
      /* Report sanitized status via readiness checks. */
    }))
  );
}
export function validSignature(body: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function cacheKey(key: string) {
  return (
    'grain-good:' +
    createHash('sha256')
      .update(process.env.APP_ORIGIN || 'local-demo')
      .digest('hex')
      .slice(0, 16) +
    ':' +
    key
  );
}
export async function rateLimit(key: string, limit = 30) {
  const result = (await redis().eval(
    "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n",
    1,
    cacheKey(`rate:${key}`),
  )) as number;
  return result <= limit;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Non-browser clients do not carry browser cookies here.
  if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN;
  try {
    const parsed = new URL(origin);
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      parsed.host === (req.headers.get('host') || new URL(req.url).host)
    );
  } catch {
    return false;
  }
}

export function closeRedis() {
  g.redis?.disconnect();
}
