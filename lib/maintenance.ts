import { redis, cacheKey } from './security';
import { expireOrders } from './live-orders';
export async function maintainReservations() {
  // Public catalogue requests can sweep expirations at most once every 30 seconds
  // across replicas. The authenticated scheduler remains the primary mechanism.
  if ((await redis().set(cacheKey('maintenance:expire'), 'running', 'EX', 30, 'NX')) === 'OK')
    await expireOrders();
}
