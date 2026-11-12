import { createHash, randomBytes } from 'node:crypto';
import { database } from './db';
import { StoreError } from './live-config';
import type { CustomerProfile } from './customer-types';
export const CUSTOMER_COOKIE = 'gg-customer';
export const CUSTOMER_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const customerAccountsEnabled = () => process.env.CUSTOMER_ACCOUNTS_ENABLED === 'true';
const addresses = {
  orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'asc' as const }],
};
function profile(user: {
  id: string;
  name: string;
  phone: string;
  addresses: { id: string; label: string; line: string; pincode: string; isDefault: boolean }[];
}): CustomerProfile {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    addresses: user.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      line: a.line,
      pincode: a.pincode,
      isDefault: a.isDefault,
    })),
    needsProfile: !user.name.trim() || !user.addresses.length,
  };
}
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function customerCookie(req: Request) {
  return (
    req.headers
      .get('cookie')
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(CUSTOMER_COOKIE + '='))
      ?.slice(CUSTOMER_COOKIE.length + 1) || ''
  );
}
export async function customerFromToken(token: string, db = database()) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.customerSession.findUnique({
    where: { tokenHash: sessionHash(token) },
    include: { user: { include: { addresses } } },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.user.blocked ||
    !session.user.phoneVerifiedAt
  )
    return null;
  return profile(session.user);
}
export async function customerFromRequest(req: Request) {
  const token = customerCookie(req);
  if (!token) return null;
  return customerFromToken(token);
}
// Only invoke after the provider has confirmed control of the phone number.
export async function createVerifiedCustomerSession(phone: string, db = database()) {
  const token = randomBytes(32).toString('hex');
  const user = await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { phone },
      create: { phone, name: '', phoneVerifiedAt: new Date() },
      update: { phoneVerifiedAt: new Date() },
      include: { addresses },
    });
    if (user.blocked)
      throw new StoreError('This account is unavailable. Please contact the store.', 403);
    await tx.customerSession.deleteMany({
      where: { userId: user.id, expiresAt: { lte: new Date() } },
    });
    await tx.customerSession.create({
      data: {
        userId: user.id,
        tokenHash: sessionHash(token),
        expiresAt: new Date(Date.now() + CUSTOMER_SESSION_SECONDS * 1000),
      },
    });
    return user;
  });
  return { token, customer: profile(user) };
}
export async function revokeCustomerSession(token: string, db = database()) {
  if (/^[a-f0-9]{64}$/.test(token))
    await db.customerSession.deleteMany({ where: { tokenHash: sessionHash(token) } });
}
export async function requireCustomer(req: Request) {
  if (!customerAccountsEnabled())
    throw new StoreError('Customer accounts are not enabled yet', 503);
  const customer = await customerFromRequest(req);
  if (!customer) throw new StoreError('Sign in with your phone and OTP first', 401);
  return customer;
}
export async function customerProfile(id: string, db = database()) {
  const user = await db.user.findUnique({ where: { id }, include: { addresses } });
  if (!user || user.blocked) throw new StoreError('Account unavailable', 403);
  return profile(user);
}
