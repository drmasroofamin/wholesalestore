import { timingSafeEqual } from 'node:crypto';
import { ensureDeliverySlots } from '@/lib/delivery-slots';
import { apiError } from '@/lib/http';
// Daily top-up for the Hobby cron in vercel.json: 18:30 UTC is midnight IST.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get('authorization') || '';
  const a = Buffer.from(actual),
    b = Buffer.from('Bearer ' + expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(
      { created: await ensureDeliverySlots(7, 20) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
