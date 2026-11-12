import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { PUBLIC_PAGES } from '@/lib/store-profile';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Policies',
    description: `About, contact, shipping, refunds, terms and privacy for ${name}.`,
  };
}

export default function Policies() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>Policies</h1>
      <ContactLines />
      <p>
        {name} takes orders for the delivery pincodes listed on the shipping page. Prices are in
        Indian rupees and include GST. Read the policy that covers your question:
      </p>
      <ul className="policy-index">
        {PUBLIC_PAGES.filter((page) => page.href !== '/policies').map((page) => (
          <li key={page.href}>
            <a href={page.href}>{page.label}</a>
          </li>
        ))}
      </ul>
      <h2>In short</h2>
      <p>
        Delivery is inside Anantnag district only, in the 10 am–1 pm and 4 pm–7 pm slots. Delivery
        is ₹25 and free when the goods reach ₹500. Cash on delivery is available up to ₹5,000.
        Online payments are handled by Razorpay. Cancel before packing, and report a damaged item
        the day it arrives. Details are on the linked pages.
      </p>
    </InfoPage>
  );
}
