import type { Metadata } from 'next';
import { ContactLines } from '@/components/contact-lines';
import { InfoPage } from '@/components/info-page';
import { storeName } from '@/lib/live-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  return {
    title: 'Cancellation and refunds',
    description: `How to cancel an order from ${name} and how refunds are paid back in INR.`,
  };
}

export default function RefundPolicy() {
  const name = storeName();
  return (
    <InfoPage>
      <h1>Cancellation and refunds</h1>
      <ContactLines />
      <p>
        Contact {name} on the <a href="/contact">contact page</a> with your order number. Refunds
        are in Indian rupees.
      </p>
      <h2>Cancellation</h2>
      <p>
        You can cancel before the order is packed. Call or write as soon as you decide. Once the
        order is out for delivery, we may not be able to cancel it.
      </p>
      <p>
        If you paid online and we cancel before packing, we refund the amount you paid, including
        the delivery fee, to the original payment method through Razorpay. We start that refund
        within 3 business days of confirming the cancellation. Your bank or UPI app may take further
        time to show the credit.
      </p>
      <p>
        Cash on delivery is collected only when the order arrives. Cancelling before delivery means
        you are not charged.
      </p>
      <h2>Damaged, missing or wrong items</h2>
      <p>
        Check the bag when it arrives. If something is damaged, missing or not what you ordered,
        tell us the same day. Include the order number and a photograph. We will replace the item or
        refund its price.
      </p>
      <p>
        If you refuse a damaged cash-on-delivery order at the door, you do not pay for it. For an
        order already paid online, an approved refund goes back through Razorpay to the original
        method. We start it within 3 business days of approval.
      </p>
      <h2>Payments that arrive after a cancellation</h2>
      <p>
        An unpaid online order is usually released after 15 minutes. If a payment arrives after the
        order was cancelled, we mark it for a refund and do not deliver it. Contact us rather than
        paying a second time. The refund goes to the original method through Razorpay.
      </p>
    </InfoPage>
  );
}
