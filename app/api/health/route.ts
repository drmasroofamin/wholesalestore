import { liveMode, onlinePaymentsEnabled } from '@/lib/live-config';
import { storeReadiness } from '@/lib/readiness';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!liveMode())
    return Response.json(
      { mode: 'demo', ready: true, acceptingOrders: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  const status = await storeReadiness();
  return Response.json(
    {
      ...status,
      acceptingOrders: status.ready && process.env.ACCEPT_ORDERS === 'true',
      onlinePayments: onlinePaymentsEnabled(),
    },
    { status: status.ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
