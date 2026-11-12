import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/security';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
