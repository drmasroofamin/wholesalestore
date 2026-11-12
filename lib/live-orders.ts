import { Prisma, PrismaClient, OrderStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { database } from './db';
import { OrderInput } from './order-input';
import { StoreError } from './live-config';
import { receiptToken } from './admin-auth';
import { splitTax } from './rules';
const detail = {
  items: true,
  history: { orderBy: { createdAt: 'asc' as const } },
  payments: true,
} as const;
export type StoredOrder = Prisma.OrderGetPayload<{ include: typeof detail }>;
export function publicOrder(order: StoredOrder) {
  return {
    id: order.id,
    total: order.total,
    subtotal: order.subtotal,
    delivery: order.deliveryFee,
    discount: order.discount,
    tax: order.tax,
    status: order.status,
    paymentStatus: order.paymentStatus,
    method: order.method,
    slot: order.slot,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    items: order.items.map((i) => ({
      id: i.variantId.replace(/-default$/, ''),
      name: i.name,
      pack: i.pack,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
    })),
    history: order.history.map((h) => ({ status: h.status, at: h.createdAt })),
    demo: false,
    receiptToken: receiptToken(order),
  };
}
export async function lockOrder(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
}
export async function readOrder(id: string, db = database()) {
  return db.order.findUnique({ where: { id }, include: detail });
}
function inputHash(data: OrderInput) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        ...data,
        items: [...data.items].sort((a, b) => a.id.localeCompare(b.id)),
        coupon: data.coupon.toUpperCase(),
      }),
    )
    .digest('hex');
}
export async function placeOrder(data: OrderInput, key: string, db: PrismaClient = database()) {
  const requestHash = inputHash(data);
  return db.$transaction(
    async (tx) => {
      // Serialize retries across all replicas, not just within one Node process.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
      const existing = await tx.order.findUnique({
        where: { idempotencyKey: key },
        include: detail,
      });
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new StoreError('This checkout key belongs to a different order', 409);
        if (existing.status === 'CANCELLED')
          throw new StoreError('This reservation has ended. Please place a new order.', 410);
        return existing;
      }
      const zone = await tx.deliveryZone.findUnique({ where: { pincode: data.pincode } });
      if (!zone?.active)
        throw new StoreError(
          'This pincode is valid, but delivery is not currently available there',
          422,
        );
      const ids = data.items.map((i) => i.id + '-default');
      const variants = await tx.productVariant.findMany({
        where: { id: { in: ids }, product: { active: true } },
        include: { product: true },
      });
      if (variants.length !== data.items.length)
        throw new StoreError('One or more products are no longer available', 409);
      const lines = data.items
        .map((i) => {
          const v = variants.find((v) => v.id === i.id + '-default')!;
          if (v.stock - v.reserved < i.quantity)
            throw new StoreError(`${v.product.name} has insufficient stock`, 409);
          return {
            variantId: v.id,
            name: v.product.name,
            pack: v.pack,
            quantity: i.quantity,
            price: v.price,
            total: v.price * i.quantity,
            gst: v.product.gst,
            hsn: v.product.hsn,
          };
        })
        .sort((a, b) => a.variantId.localeCompare(b.variantId));
      const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
      let discount = 0;
      if (data.coupon) {
        const c = await tx.coupon.findUnique({ where: { code: data.coupon.toUpperCase() } });
        if (!c?.active || c.expiresAt <= new Date() || subtotal < c.minimum)
          throw new StoreError('Coupon is not valid for this order');
        discount = Math.min(Math.round((subtotal * c.percent) / 100), c.maximum, subtotal);
      }
      const deliveryFee = subtotal >= zone.freeAbove ? 0 : zone.fee;
      const total = subtotal - discount + deliveryFee;
      if (!Number.isSafeInteger(total) || total < 100 || total > 10000000)
        throw new StoreError('Order value must be between ₹1 and ₹1,00,000');
      if (data.payment === 'COD' && total > zone.codLimit)
        throw new StoreError('This order exceeds the cash-on-delivery limit for your area');
      if (data.expectedTotal === undefined || data.expectedTotal !== total)
        throw new StoreError(
          'Prices or delivery fees changed. Refresh your cart and review the total before ordering.',
          409,
        );
      const booked =
        await tx.$executeRaw`UPDATE "DeliverySlot" SET booked=booked+1 WHERE id=${data.slot} AND booked<capacity AND "cutoffAt">NOW()`;
      if (booked !== 1)
        throw new StoreError(
          'This delivery slot is no longer available. Choose another slot.',
          409,
        );
      for (const line of lines) {
        const n =
          await tx.$executeRaw`UPDATE "ProductVariant" SET reserved=reserved+${line.quantity} WHERE id=${line.variantId} AND stock-reserved>=${line.quantity}`;
        if (n !== 1)
          throw new StoreError(`${line.name} has just sold out. Your order was not placed.`, 409);
      }
      let allocated = 0;
      const tax = lines.reduce((sum, line, index) => {
        const share =
          index === lines.length - 1
            ? discount - allocated
            : Math.floor((discount * line.total) / subtotal);
        allocated += share;
        return sum + splitTax(line.total - share, line.gst).tax;
      }, 0);
      const online = data.payment !== 'COD';
      const order = await tx.order.create({
        data: {
          id: 'GG-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(),
          idempotencyKey: key,
          requestHash,
          customerName: data.name,
          phone: data.phone,
          address: data.address,
          pincode: data.pincode,
          slot: data.slot,
          method: online
            ? process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')
              ? 'RAZORPAY_TEST'
              : 'RAZORPAY'
            : 'COD',
          subtotal,
          discount,
          deliveryFee,
          total,
          tax,
          paymentStatus: online ? 'PENDING' : 'COD_PENDING',
          expiresAt: online ? new Date(Date.now() + 15 * 60 * 1000) : null,
          items: { create: lines },
          history: {
            create: {
              status: 'PLACED',
              note: online
                ? 'Awaiting online payment'
                : 'Cash on delivery; contact customer to confirm',
            },
          },
        },
        include: detail,
      });
      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          variantId: l.variantId,
          quantity: -l.quantity,
          reason: 'ORDER_RESERVED',
          orderId: order.id,
        })),
      });
      return order;
    },
    { timeout: 15000, maxWait: 5000 },
  );
}
const next: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
export async function releaseOrder(tx: Prisma.TransactionClient, order: StoredOrder, note: string) {
  for (const line of [...order.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
    const n =
      await tx.$executeRaw`UPDATE "ProductVariant" SET reserved=reserved-${line.quantity} WHERE id=${line.variantId} AND reserved>=${line.quantity}`;
    if (n !== 1) throw new Error('Reservation invariant violated');
  }
  await tx.deliverySlot.updateMany({
    where: { id: order.slot, booked: { gt: 0 } },
    data: { booked: { decrement: 1 } },
  });
  await tx.stockMovement.createMany({
    data: order.items.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      reason: 'RESERVATION_RELEASED',
      orderId: order.id,
    })),
  });
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: 'CANCELLED',
      expiresAt: null,
      history: { create: { status: 'CANCELLED', note } },
    },
  });
}
export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
  cashCollected = false,
  db = database(),
) {
  return db.$transaction(
    async (tx) => {
      await lockOrder(tx, id);
      const order = await tx.order.findUnique({ where: { id }, include: detail });
      if (!order) throw new StoreError('Order not found', 404);
      if (order.status === status) return order;
      if (!next[order.status].includes(status))
        throw new StoreError('This order status change is not allowed', 409);
      if (status === 'CANCELLED') {
        if (order.method === 'RAZORPAY' && ['PAID', 'PARTIALLY_PAID'].includes(order.paymentStatus))
          throw new StoreError('Refund this paid order in Razorpay before cancelling it', 409);
        await releaseOrder(tx, order, 'Cancelled by merchant');
      } else {
        if (order.method === 'RAZORPAY_TEST')
          throw new StoreError(
            'Test-payment orders cannot be fulfilled. Cancel this test order after verification.',
            409,
          );
        if (order.method === 'RAZORPAY' && order.paymentStatus !== 'PAID')
          throw new StoreError('Confirm online payment before preparing the order', 409);
        if (status === 'DELIVERED') {
          if (order.method === 'COD' && !cashCollected)
            throw new StoreError(
              'Confirm that the full COD amount was collected before marking delivered',
            );
          for (const line of [...order.items].sort((a, b) =>
            a.variantId.localeCompare(b.variantId),
          )) {
            const n =
              await tx.$executeRaw`UPDATE "ProductVariant" SET stock=stock-${line.quantity}, reserved=reserved-${line.quantity} WHERE id=${line.variantId} AND reserved>=${line.quantity} AND stock>=${line.quantity}`;
            if (n !== 1) throw new Error('Inventory invariant violated');
          }
        }
        await tx.order.update({
          where: { id },
          data: {
            status,
            ...(status === 'DELIVERED' && order.method === 'COD'
              ? { paymentStatus: 'COD_COLLECTED' as const }
              : {}),
            history: {
              create: {
                status,
                note:
                  status === 'DELIVERED' && order.method === 'COD'
                    ? 'Merchant confirmed full COD collection'
                    : null,
              },
            },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: 'merchant-admin',
          action: 'ORDER_STATUS_CHANGED',
          targetId: id,
          metadata: { from: order.status, to: status, cashCollected },
        },
      });
      return (await tx.order.findUnique({ where: { id }, include: detail }))!;
    },
    { timeout: 15000 },
  );
}
export async function expireOrders(db = database()) {
  const candidates = await db.order.findMany({
    where: {
      status: 'PLACED',
      method: { in: ['RAZORPAY', 'RAZORPAY_TEST'] },
      paymentStatus: { in: ['PENDING', 'FAILED', 'AUTHORIZED'] },
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
    orderBy: { expiresAt: 'asc' },
  });
  let expired = 0;
  for (const candidate of candidates) {
    await db.$transaction(async (tx) => {
      await lockOrder(tx, candidate.id);
      const order = await tx.order.findUnique({ where: { id: candidate.id }, include: detail });
      if (
        order?.status === 'PLACED' &&
        order.expiresAt &&
        order.expiresAt <= new Date() &&
        !['PAID', 'REFUNDED'].includes(order.paymentStatus)
      ) {
        await releaseOrder(tx, order, 'Online payment reservation expired');
        expired++;
      }
    });
  }
  return expired;
}
