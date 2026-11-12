import { database } from './db';
import { publicOrder, readOrder } from './live-orders';
import { StoreError } from './live-config';
export async function customerOrders(userId: string, page = 0, db = database()) {
  const rows = await db.order.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: page * 20,
    take: 21,
    include: { items: true, history: { orderBy: { createdAt: 'asc' } }, payments: true },
  });
  return {
    orders: rows
      .slice(0, 20)
      .map((o) => ({
        ...publicOrder(o),
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        pincode: o.pincode,
      })),
    hasMore: rows.length > 20,
  };
}
export async function ownedOrder(userId: string, id: string, db = database()) {
  const order = await readOrder(id, db);
  if (!order || order.userId !== userId) throw new StoreError('Order not found', 404);
  return order;
}
