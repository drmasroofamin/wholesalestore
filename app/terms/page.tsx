import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Terms and conditions',
    description: `Terms for ordering from ${name}. Prices are in INR. Delivery is in Anantnag district.`,
  };
}

export default function Terms() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>Terms and conditions</h1>
      <ContactLines />
      <p>
        These terms apply when you order from {name}. Placing an order means you accept them, along
        with the <a href="/shipping-policy">shipping and delivery</a> and{' '}
        <a href="/refund-policy">cancellation and refund</a> policies.
      </p>
      <h2>Prices</h2>
      <p>
        Prices are in Indian rupees (INR) and include GST. The checkout total is calculated on the
        server from the current price, the delivery fee for your pincode, and any delivery waiver.
        That total is the amount you pay. A product that is out of stock cannot be added to the
        cart.
      </p>
      <h2>Orders</h2>
      <p>
        You need a name, a 10-digit Indian mobile number, a delivery address and a pincode we
        deliver to. You choose an open delivery slot. We may refuse an order we cannot fulfil, and
        we will not charge you for goods we do not deliver.
      </p>
      <h2>Payment</h2>
      <p>
        Cash on delivery is available up to the limit for your pincode, which is ₹5,000 unless the
        delivery area shows a different limit. You pay the rider when the order arrives. Online
        payment by UPI, card or netbanking is taken by Razorpay. An online order is ready for
        delivery only after the payment is confirmed. We do not see or store your card number.
      </p>
      <h2>Delivery and returns</h2>
      <p>
        Delivery is described on the <a href="/shipping-policy">shipping page</a>. Cancellation and
        refunds are described on the <a href="/refund-policy">refund page</a>.
      </p>
      <h2>Your details</h2>
      <p>
        You agree that the name, phone and address you enter are yours and are accurate enough for
        us to deliver. How we use that information is described in the{' '}
        <a href="/privacy">privacy policy</a>.
      </p>
      <h2>Law</h2>
      <p>
        These terms are governed by the laws of India. Disputes are subject to the courts at
        Anantnag, Jammu & Kashmir.
      </p>
    </InfoPage>
  );
}
