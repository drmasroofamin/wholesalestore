import { liveMode, liveSettings, onlinePaymentsEnabled } from '@/lib/live-config';
import { database } from '@/lib/db';
import { liveCatalog } from '@/lib/live-catalog';
import { apiError } from '@/lib/http';
import { maintainReservations } from '@/lib/maintenance';
import { ensureDeliverySlots } from '@/lib/delivery-slots';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!liveMode())
    return Response.json({ live: false }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const config = liveSettings();
    await maintainReservations();
    const db = database();
    const openSlots = () =>
      db.deliverySlot.findMany({
        where: { cutoffAt: { gt: new Date() }, booked: { lt: db.deliverySlot.fields.capacity } },
        orderBy: { startsAt: 'asc' },
        take: 30,
      });
    const [products, zones, initialSlots] = await Promise.all([
      liveCatalog(),
      db.deliveryZone.findMany({ where: { active: true }, orderBy: { pincode: 'asc' } }),
      openSlots(),
    ]);
    let slots = initialSlots;
    if (!slots.some((slot) => slot.booked < slot.capacity)) {
      await ensureDeliverySlots(7, 20, db);
      slots = await openSlots();
    }
    return Response.json(
      {
        live: true,
        acceptingOrders: process.env.ACCEPT_ORDERS === 'true',
        name: config.name,
        phone: config.phone,
        district: config.district,
        onlinePayments: onlinePaymentsEnabled(),
        paymentTestMode: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') || false,
        products,
        zones,
        slots: slots
          .filter((s) => s.booked < s.capacity)
          .map((s) => ({
            id: s.id,
            label:
              new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              }).format(s.startsAt) +
              ' – ' +
              new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
              }).format(s.endsAt),
          })),
      },
      {
        headers: {
          'Cache-Control': new URL(request.url).searchParams.has('refresh')
            ? 'no-store'
            : 'public, s-maxage=15, stale-while-revalidate=5',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
