export const liveMode = () => process.env.DEMO_MODE === 'false';
export const DEFAULT_STORE_NAME = 'zebastore';
export function liveSettings() {
  const origin = process.env.APP_ORIGIN;
  const name = process.env.STORE_NAME?.trim();
  const phone = process.env.STORE_PHONE?.trim();
  if (
    !origin ||
    !name ||
    !phone ||
    !process.env.DATABASE_URL ||
    !process.env.REDIS_URL ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    !process.env.ADMIN_PASSWORD_HASH
  )
    throw new Error('Store configuration is incomplete');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Live store requires HTTPS');
  return {
    origin: url.origin,
    name,
    phone,
    district: process.env.STORE_DISTRICT || 'Anantnag district',
  };
}
/** Public name. Prefers liveSettings().name when the server is fully configured. */
export function storeName() {
  try {
    return liveSettings().name;
  } catch {
    return process.env.STORE_NAME?.trim() || DEFAULT_STORE_NAME;
  }
}
export function onlinePaymentsEnabled() {
  return !!(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET
  );
}
export class StoreError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
