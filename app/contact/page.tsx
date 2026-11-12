import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Contact',
    description: `Contact ${name} in Anantnag, Jammu & Kashmir, about an order, a delivery or a refund.`,
  };
}

export default function Contact() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>Contact {name}</h1>
      <p>
        Call or write about an order, a delivery slot, a missing item or a refund. Keep your order
        number from the receipt.
      </p>
      <ContactLines />
      <h2>When to reach us</h2>
      <p>
        Delivery slots are 10 am–1 pm and 4 pm–7 pm, India time. We answer the phone during those
        hours. Email is read on business days.
      </p>
      <h2>What to include</h2>
      <ul>
        <li>Your name and the mobile number used at checkout</li>
        <li>The order number</li>
        <li>The delivery pincode</li>
        <li>For a damaged or wrong item, a photograph and a short description</li>
      </ul>
      <p>
        Wholesale enquiries from kirana shops can use the same phone and email. Tell us the shop
        name and what you want to reorder. We confirm the price before you pay.
      </p>
      <p>
        <a href="/#shop">Back to the shop</a>
      </p>
    </InfoPage>
  );
}
