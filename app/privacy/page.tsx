import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Privacy policy',
    description: `How ${name} uses your name, mobile number, address and order details.`,
  };
}

export default function Privacy() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>Privacy policy</h1>
      <ContactLines />
      <p>
        {name} uses your information to take orders, deliver them and keep the records a shop has to
        keep. We do not sell your information.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Name, mobile number, delivery address and pincode</li>
        <li>The items, quantities and total of an order</li>
        <li>The delivery slot you choose and the payment method</li>
        <li>A payment reference from Razorpay when you pay online</li>
      </ul>
      <p>
        Card numbers, UPI PINs and netbanking passwords are entered on Razorpay’s page. They are not
        stored by this shop.
      </p>
      <h2>Why we use it</h2>
      <ul>
        <li>To confirm the order, pack it and deliver it</li>
        <li>To take payment or collect cash on delivery</li>
        <li>To answer a question, cancellation or refund</li>
        <li>To keep tax and payment records</li>
      </ul>
      <h2>Who else handles it</h2>
      <p>
        The shop’s hosting, database and Redis providers store the order so it is not lost if a
        server restarts. Razorpay processes online payments. They receive only what is needed for
        that work. Store staff see orders through a protected admin account.
      </p>
      <h2>What stays on your device</h2>
      <p>
        The cart, saved favourites and the latest receipt are stored in this browser. The receipt
        link is private. Do not share it. Clearing this site’s data in the browser removes those
        local records. It does not delete the order we have already saved.
      </p>
      <h2>How long we keep it</h2>
      <p>
        We keep order and payment records for as long as tax, accounting or a payment dispute
        requires. You can ask us to correct your contact details, or to delete information we are
        not required to keep, using the phone or email on the <a href="/contact">contact page</a>.
      </p>
    </InfoPage>
  );
}
