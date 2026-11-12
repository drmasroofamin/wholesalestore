import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_COOKIE, adminToken, checkPassword } from '@/lib/admin-auth';
import { liveSettings } from '@/lib/live-config';
import { rateLimit, sameOrigin } from '@/lib/security';
import { readJson, apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
    const config = liveSettings();
    const ip = process.env.VERCEL === '1' ? req.headers.get('x-real-ip') || 'unknown' : 'shared';
    if (!(await rateLimit('admin-login:' + ip, 5)))
      return Response.json(
        { error: 'Too many sign-in attempts. Wait one minute.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    const { password } = z
      .object({ password: z.string().min(1).max(200) })
      .parse(await readJson(req, 1024));
    if (!checkPassword(password))
      return Response.json({ error: 'Incorrect password' }, { status: 401 });
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(ADMIN_COOKIE, adminToken(), {
      httpOnly: true,
      secure: config.origin.startsWith('https:'),
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch (e) {
    return apiError(e);
  }
}
