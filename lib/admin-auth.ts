import { createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
export const ADMIN_COOKIE = 'gg-admin';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Session signing is not configured');
  return value;
}
export function signToken(purpose: string, data: Record<string, unknown>, expiresAt: number) {
  const body = Buffer.from(JSON.stringify({ ...data, purpose, exp: expiresAt })).toString(
    'base64url',
  );
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
export function readToken(token: string, purpose: string): Record<string, unknown> | null {
  try {
    if (token.length > 4096) return null;
    const [body, signature, ...extra] = token.split('.');
    if (!body || !signature || extra.length) return null;
    const expected = createHmac('sha256', secret()).update(body).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return data.purpose === purpose && typeof data.exp === 'number' && data.exp > Date.now()
      ? data
      : null;
  } catch {
    return null;
  }
}
function passwordVersion() {
  return createHash('sha256')
    .update(process.env.ADMIN_PASSWORD_HASH || '')
    .digest('hex');
}
export function validAdmin(token: string) {
  const data = readToken(token, 'admin');
  return !!data && data.version === passwordVersion();
}
export function adminToken() {
  return signToken('admin', { version: passwordVersion() }, Date.now() + 8 * 60 * 60 * 1000);
}
export function adminFromRequest(req: Request) {
  const cookie = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(ADMIN_COOKIE + '='));
  return validAdmin(cookie?.slice(ADMIN_COOKIE.length + 1) || '');
}
export function checkPassword(password: string, stored = process.env.ADMIN_PASSWORD_HASH || '') {
  try {
    const [algorithm, salt, hash] = stored.split(':');
    if (algorithm !== 'scrypt' || !/^\w{32}$/.test(salt) || !/^\w{128}$/.test(hash)) return false;
    const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
    return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
export function receiptToken(order: { id: string; createdAt: Date }) {
  return signToken(
    'receipt',
    { id: order.id },
    order.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
}
export function canReadReceipt(req: Request, id: string) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  return readToken(bearer, 'receipt')?.id === id;
}
