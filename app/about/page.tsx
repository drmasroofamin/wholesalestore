import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'About',
    description: `${name} is a grocery in Anantnag, Jammu & Kashmir. We sell rice, atta, pulses, oil, sugar, millets and biscuits. Prices are in INR.`,
  };
}

export default function About() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>About {name}</h1>
      <ContactLines />
      <p>
        {name} sells everyday kitchen essentials at wholesale prices. The shop is for homes and
        kirana stores in Anantnag district. We pack rice, atta, pulses, oil, sugar, millets and
        biscuits here and deliver them ourselves.
      </p>
      <h2>What we sell</h2>
      <ul>
        <li>Premium Basmati Rice, 5 kg</li>
        <li>Chakki Fresh Atta, 5 kg</li>
        <li>Unpolished Toor Dal, 1 kg</li>
        <li>Whole Green Moong, 1 kg</li>
        <li>Premium Kabuli Chana, 1 kg</li>
        <li>Organic Pearl Millet (bajra), 1 kg</li>
        <li>Cold Pressed Mustard Oil, 1 litre</li>
        <li>Natural Sulphur-free Sugar, 1 kg</li>
        <li>Glucose Biscuit, 1 pack</li>
      </ul>
      <p>
        Every price is in Indian rupees and includes GST. The price on the product is the price you
        pay for the goods, plus delivery when it applies. Photographs show the food itself. They are
        not a promise of a particular brand of packet.
      </p>
      <h2>Where we deliver</h2>
      <p>
        Delivery is only inside Anantnag district, Jammu & Kashmir, and only to the pincodes listed
        on the <a href="/shipping-policy">shipping and delivery</a> page. We do not courier orders
        to other districts or states.
      </p>
      <p>
        <a href="/#shop">Shop the essentials</a> or <a href="/contact">contact the store</a>.
      </p>
    </InfoPage>
  );
}
