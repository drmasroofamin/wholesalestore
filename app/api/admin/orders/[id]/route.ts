import { z } from 'zod';
import { adminFromRequest } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/security';
import { changeOrderStatus } from '@/lib/live-orders';
import { readJson, apiError } from '@/lib/http';
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const input = z
      .object({
        status: z.enum(['CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
        cashCollected: z.boolean().default(false),
      })
      .parse(await readJson(req));
    const { id } = await context.params;
    return Response.json(
      { order: await changeOrderStatus(id, input.status, input.cashCollected) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
