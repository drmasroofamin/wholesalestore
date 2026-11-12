import { z } from 'zod';
import { adminFromRequest } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/security';
import { readJson, apiError } from '@/lib/http';
import { ensureDeliverySlots } from '@/lib/delivery-slots';
export async function POST(req: Request) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const input = z
      .object({ days: z.number().int().min(1).max(14), capacity: z.number().int().min(1).max(500) })
      .parse(await readJson(req));
    return Response.json({ created: await ensureDeliverySlots(input.days, input.capacity) });
  } catch (e) {
    return apiError(e);
  }
}
