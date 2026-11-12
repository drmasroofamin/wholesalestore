import { NextResponse } from 'next/server';
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_SECONDS,
  customerAccountsEnabled,
} from './customer-auth';
import { liveMode, StoreError } from './live-config';
import { sameOrigin } from './security';
export function accountEnabled() {
  if (!liveMode() || !customerAccountsEnabled())
    throw new StoreError('Phone sign-in is not enabled yet', 503);
}
export function customerWrite(req: Request) {
  accountEnabled();
  if (!sameOrigin(req)) throw new StoreError('Invalid origin', 403);
}
export function privateJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
export function setCustomerCookie(response: NextResponse, token: string) {
  response.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_ORIGIN?.startsWith('https:') || false,
    sameSite: 'lax',
    path: '/',
    maxAge: token ? CUSTOMER_SESSION_SECONDS : 0,
  });
  return response;
}
