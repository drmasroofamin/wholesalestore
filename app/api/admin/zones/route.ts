import { z } from 'zod';
import { adminFromRequest } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/security';
import { database } from '@/lib/db';
import { readJson, apiError } from '@/lib/http';
import { PINCODE_REGEX } from '@/lib/pincode';
export async function GET(req: Request) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return Response.json(
      {
        zones: await database().deliveryZone.findMany({ orderBy: { pincode: 'asc' } }),
        slots: await database().deliverySlot.findMany({
          where: { endsAt: { gt: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 100,
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const data = z
      .object({
        pincode: z.string().regex(PINCODE_REGEX),
        fee: z.number().int().min(0).max(100000),
        freeAbove: z.number().int().min(0).max(10000000),
        codLimit: z.number().int().min(0).max(10000000),
        active: z.boolean(),
      })
      .parse(await readJson(req));
    await database().$transaction(async (tx) => {
      await tx.deliveryZone.upsert({
        where: { pincode: data.pincode },
        create: data,
        update: data,
      });
      await tx.auditLog.create({
        data: {
          actorId: 'merchant-admin',
          action: 'DELIVERY_ZONE_UPDATED',
          targetId: data.pincode,
          metadata: data,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
