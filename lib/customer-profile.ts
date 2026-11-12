import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { database } from './db';
import { StoreError } from './live-config';
import { PINCODE_REGEX, PINCODE_HINT } from './pincode';
import { customerProfile } from './customer-auth';
export const addressInput = z.object({
  id: z.string().max(100).optional(),
  label: z.enum(['Home', 'Shop', 'Other']).default('Home'),
  line: z.string().trim().min(10, 'Enter a complete address including a landmark').max(500),
  pincode: z.string().trim().regex(PINCODE_REGEX, PINCODE_HINT),
  isDefault: z.boolean().default(true),
});
export const profileInput = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  address: addressInput,
});
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user || user.blocked || !user.phoneVerifiedAt)
    throw new StoreError('Account is unavailable', 403);
}
async function writeAddress(
  tx: Prisma.TransactionClient,
  userId: string,
  data: z.infer<typeof addressInput>,
) {
  const existing = data.id
    ? await tx.address.findFirst({ where: { id: data.id, userId } })
    : await tx.address.findFirst({
        where: { userId, label: data.label, line: data.line, pincode: data.pincode },
      });
  if (data.id && !existing) throw new StoreError('Address not found', 404);
  const count = await tx.address.count({ where: { userId } });
  if (!existing && count >= 10)
    throw new StoreError(
      'You can save up to 10 addresses. Edit or remove an existing address first.',
    );
  const makeDefault = data.isDefault || count === 0;
  if (makeDefault)
    await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  const values = {
    label: data.label,
    line: data.line,
    pincode: data.pincode,
    isDefault: makeDefault || existing?.isDefault || false,
  };
  if (existing) return tx.address.update({ where: { id: existing.id }, data: values });
  return tx.address.create({ data: { ...values, userId } });
}
export async function saveProfile(
  userId: string,
  input: z.infer<typeof profileInput>,
  db = database(),
) {
  const data = profileInput.parse(input);
  await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    await tx.user.update({ where: { id: userId }, data: { name: data.name } });
    await writeAddress(tx, userId, data.address);
  });
  return customerProfile(userId, db);
}
export async function saveAddress(
  userId: string,
  input: z.infer<typeof addressInput>,
  db = database(),
) {
  const data = addressInput.parse(input);
  await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    await writeAddress(tx, userId, data);
  });
  return customerProfile(userId, db);
}
export async function removeAddress(userId: string, id: string, db = database()) {
  await db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const found = await tx.address.findFirst({ where: { id, userId } });
    if (!found) throw new StoreError('Address not found', 404);
    await tx.address.delete({ where: { id } });
    if (found.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return customerProfile(userId, db);
}
