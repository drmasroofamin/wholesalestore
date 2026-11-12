import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { publicDeliveryZones } from '@/lib/delivery-zones';
import { money } from '@/lib/catalog';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Shipping and delivery',
    description: `${name} delivers in Anantnag district only. Slots are 10 am–1 pm and 4 pm–7 pm. Delivery is ₹25, free from ₹500.`,
  };
}

export default async function ShippingPolicy() {
  const name = storeName();
  const zones = await publicDeliveryZones();
  const first = zones[0];
  const uniform =
    !!first &&
    zones.every(
      (zone) =>
        zone.fee === first.fee &&
        zone.freeAbove === first.freeAbove &&
        zone.codLimit === first.codLimit,
    );
  return (
    <InfoPage>
      <h1>Shipping and delivery</h1>
      <ContactLines />
      <p>
        {name} delivers inside Anantnag district, Jammu & Kashmir, and nowhere else. We do not ship
        by courier to other districts or states. A valid Indian pincode is not enough. The pincode
        has to be on the list below.
      </p>
      <h2>Delivery pincodes</h2>
      <p>
        These are the active delivery areas. The fee, the order value for free delivery, and the
        cash-on-delivery limit are in Indian rupees.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pincode</th>
              <th>Area</th>
              <th>Delivery fee</th>
              <th>Free delivery from</th>
              <th>Cash on delivery up to</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.pincode}>
                <td>{zone.pincode}</td>
                <td>{zone.area}</td>
                <td>{money(zone.fee)}</td>
                <td>{money(zone.freeAbove)}</td>
                <td>{money(zone.codLimit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Delivery charge</h2>
      {uniform && first ? (
        <p>
          Delivery costs {money(first.fee)}. It is free when the goods in the order reach{' '}
          {money(first.freeAbove)}. Cash on delivery is available up to {money(first.codLimit)}.
        </p>
      ) : (
        <p>Each pincode’s fee, free-delivery amount and cash-on-delivery limit are in the table.</p>
      )}
      <h2>Delivery slots</h2>
      <p>
        There are two slots each day, India time (Asia/Kolkata): 10 am–1 pm and 4 pm–7 pm. A slot
        stops taking orders one hour before it starts. When a slot is open, delivery is usually the
        same day or the next day. If every slot is full, checkout asks you to wait until the store
        opens another one.
      </p>
      <h2>How the order arrives</h2>
      <p>
        We pack the order in Anantnag and bring it to the house or shop address you enter. Please
        give a landmark and a phone number that is switched on. If we cannot find the address, we
        will call that number.
      </p>
      <p>
        Questions about a delay go to the <a href="/contact">contact page</a>. Cancellation is
        covered by the <a href="/refund-policy">refund policy</a>.
      </p>
    </InfoPage>
  );
}
