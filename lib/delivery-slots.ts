import { database } from './db';
export async function ensureDeliverySlots(days = 7, capacity = 20, db = database()) {
  let created = 0;
  for (let offset = 0; offset < days; offset++) {
    const localDate = new Date(Date.now() + offset * 86400000 + 19800000)
      .toISOString()
      .slice(0, 10);
    for (const [start, end] of [
      ['10:00', '13:00'],
      ['16:00', '19:00'],
    ]) {
      const startsAt = new Date(`${localDate}T${start}:00+05:30`),
        endsAt = new Date(`${localDate}T${end}:00+05:30`),
        cutoffAt = new Date(startsAt.getTime() - 3600000);
      if (cutoffAt <= new Date()) continue;
      const id = `slot-${localDate}-${start.replace(':', '')}`;
      const result = await db.deliverySlot.createMany({
        data: [{ id, startsAt, endsAt, cutoffAt, capacity }],
        skipDuplicates: true,
      });
      created += result.count;
    }
  }
  return created;
}
