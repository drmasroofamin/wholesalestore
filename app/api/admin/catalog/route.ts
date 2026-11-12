import { z } from 'zod';
import { adminFromRequest } from '@/lib/admin-auth';
import { sameOrigin } from '@/lib/security';
import { database } from '@/lib/db';
import { readJson, apiError } from '@/lib/http';
import { StoreError } from '@/lib/live-config';
export async function GET(req: Request) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return Response.json(
      {
        variants: await database().productVariant.findMany({
          include: { product: true },
          orderBy: { id: 'asc' },
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request) {
  if (!adminFromRequest(req)) return Response.json({ error: 'Sign in first' }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const data = z
      .object({
        id: z.string().max(100),
        price: z.number().int().min(100).max(10000000),
        mrp: z.number().int().min(100).max(10000000),
        stock: z.number().int().min(0).max(1000000),
      })
      .refine((d) => d.mrp >= d.price, { message: 'MRP cannot be less than the selling price' })
      .parse(await readJson(req));
    await database().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${data.id} FOR UPDATE`;
      const previous = await tx.productVariant.findUnique({ where: { id: data.id } });
      const affected =
        await tx.$executeRaw`UPDATE "ProductVariant" SET price=${data.price},mrp=${data.mrp},stock=${data.stock} WHERE id=${data.id} AND reserved<=${data.stock}`;
      if (affected !== 1)
        throw new StoreError('Stock cannot be reduced below reserved orders', 409);
      if (previous && previous.stock !== data.stock)
        await tx.stockMovement.create({
          data: {
            variantId: data.id,
            quantity: data.stock - previous.stock,
            reason: 'MERCHANT_ADJUSTMENT',
          },
        });
      await tx.auditLog.create({
        data: {
          actorId: 'merchant-admin',
          action: 'INVENTORY_UPDATED',
          targetId: data.id,
          metadata: data,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
