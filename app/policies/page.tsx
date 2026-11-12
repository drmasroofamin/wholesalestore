import { liveMode } from '@/lib/live-config';
export const dynamic = 'force-dynamic';
export default function Policies() {
  const live = liveMode(),
    name = process.env.STORE_NAME || 'Grain & Good',
    phone = process.env.STORE_PHONE,
    address = process.env.STORE_ADDRESS;
  return (
    <main className="wrap" style={{ maxWidth: 800, padding: '50px 0' }}>
      <a href="/">← Back to the store</a>
      <h1>Care, clarity & trust.</h1>
      {live ? (
        <>
          <p>
            {name} accepts orders for approved delivery pincodes in{' '}
            {process.env.STORE_DISTRICT || 'Anantnag district'}. Contact the merchant to confirm
            service availability, business details and an existing order.
          </p>
          {phone && (
            <p>
              Customer support: <a href={'tel:' + phone}>{phone}</a>
              {address && (
                <>
                  <br />
                  {address}
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <p>This is a demonstration. No real payment or delivery is provided in demo mode.</p>
      )}
      <h2>Privacy</h2>
      <p>
        {live
          ? 'We store your name, mobile number, delivery address, order items and payment references to process orders, provide support and maintain business records. Store staff access order details through a protected admin account. Hosting, database, Redis and Razorpay providers process data needed to deliver these services. Card details are handled by Razorpay checkout and are not stored by this application.'
          : 'Demo checkout validates contact details without persisting them on the server.'}
      </p>
      <p>
        Cart, favourites and the latest receipt are stored on your device. Clear browser site data
        to remove local records. Your private receipt token grants access to order status; do not
        share it.
      </p>
      <h2>Prices and payments</h2>
      <p>
        {live
          ? 'Prices are in INR. The final server-verified total, applicable GST and delivery fee are shown before checkout. COD is subject to your delivery zone’s order-value limit. Online payment is processed through Razorpay. An online order is fulfilment-ready only after the server confirms captured payment. Test-mode payments are identified and cannot be fulfilled as paid orders.'
          : 'Displayed prices and business details are sample data.'}
      </p>
      <p>
        Product photos are stock photographs used under the licences recorded with this site. They
        illustrate the food and do not guarantee branded packaging.{' '}
        <a href="/products/CREDITS.md">Photo credits and licences</a>.
      </p>
      <h2>Cancellation & refunds</h2>
      <p>
        {live
          ? process.env.CANCELLATION_POLICY ||
            'Contact the merchant using the support number above to request cancellation before packing. Paid orders require payment reconciliation and refund confirmation before cancellation.'
          : 'No money is collected in demo mode.'}
      </p>
      {live && (
        <p>
          {process.env.REFUND_POLICY ||
            'For damaged or incorrect items, contact the merchant promptly with your order reference and photographs. The merchant will verify the request and communicate eligibility and timelines. Approved online refunds are processed to the original payment method through Razorpay; bank processing times may vary.'}
        </p>
      )}
      <h2>Delivery</h2>
      <p>
        {live
          ? 'Delivery is available only for explicitly approved pincodes and available delivery slots. A valid pincode format does not guarantee coverage. Contact the merchant to confirm the delivery address and discuss delays or special requirements.'
          : 'Delivery slots and pincodes are illustrative.'}
      </p>
      <p>
        {live
          ? 'Unpaid online reservations normally expire after 15 minutes. If a payment is received after cancellation or expiry, the order is flagged for merchant review and refund; contact support rather than paying again.'
          : 'No courier is dispatched for a demo order.'}
      </p>
      <h2>Data deletion</h2>
      <p>
        {live
          ? 'Contact the merchant using the support number above to request access, correction or deletion of your information. Records required for tax, payment reconciliation or other legal obligations may need to be retained.'
          : 'Remove local demo records in your browser’s site-data settings.'}
      </p>
    </main>
  );
}
