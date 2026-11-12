import { z } from 'zod';
import { PINCODE_REGEX, PINCODE_HINT } from './pincode';
export const orderInput = z
  .object({
    items: z
      .array(
        z.object({ id: z.string().min(1).max(80), quantity: z.number().int().min(1).max(500) }),
      )
      .min(1)
      .max(50),
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    address: z.string().trim().min(10).max(500),
    pincode: z.string().trim().regex(PINCODE_REGEX, PINCODE_HINT),
    slot: z.string().min(1).max(100),
    payment: z.enum(['COD', 'UPI', 'Card', 'Netbanking']),
    coupon: z.string().trim().max(30).default(''),
    expectedTotal: z.number().int().nonnegative().optional(),
  })
  .refine((d) => new Set(d.items.map((i) => i.id)).size === d.items.length, {
    message: 'Duplicate product lines',
  });
export type OrderInput = z.infer<typeof orderInput>;
