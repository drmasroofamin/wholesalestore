import { liveMode, liveSettings, onlinePaymentsEnabled } from '@/lib/live-config';
import { database } from '@/lib/db';
import { redis } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!liveMode()) return Response.json({ mode: 'demo', ready: true, acceptingOrders: false });
  try {
    liveSettings();
    await Promise.all([database().$queryRaw`SELECT 1`, redis().ping()]);
    return Response.json(
      {
        mode: 'live',
        ready: true,
        acceptingOrders: process.env.ACCEPT_ORDERS === 'true',
        onlinePayments: onlinePaymentsEnabled(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=10' } },
    );
  } catch {
    return Response.json(
      { mode: 'live', ready: false, acceptingOrders: false },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
