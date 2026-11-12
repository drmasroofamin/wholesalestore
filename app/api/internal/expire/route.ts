import { timingSafeEqual } from 'node:crypto';
import { expireOrders } from '@/lib/live-orders';
import { apiError } from '@/lib/http';
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get('authorization') || '';
  const a = Buffer.from(actual),
    b = Buffer.from('Bearer ' + expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(
      { expired: await expireOrders() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
