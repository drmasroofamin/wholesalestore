import { liveMode } from './live-config';

/** Public legal-entity line for policies, the footer and Razorpay review. */
export const LEGAL_ENTITY = 'zebastore, operated by Masroof Amin, Anantnag, Jammu & Kashmir, India';

/** Sample number that must never be rendered. It is not the store's phone. */
const SAMPLE_PHONE_DIGITS = new Set(['1942450000', '01942450000', '911942450000']);

export const PUBLIC_PAGES = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/shipping-policy', label: 'Shipping & delivery' },
  { href: '/refund-policy', label: 'Cancellation & refunds' },
  { href: '/terms', label: 'Terms & conditions' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/policies', label: 'All policies' },
  { href: '/credits', label: 'Photo credits' },
] as const;

/** Anantnag district pincodes inserted by the delivery-zone migration. */
export const ANANTNAG_ZONES = [
  { pincode: '192101', area: 'Anantnag HO' },
  { pincode: '192122', area: 'Anantnag City' },
  { pincode: '192124', area: 'Bijbehara' },
  { pincode: '192125', area: 'Martand' },
  { pincode: '192126', area: 'Pahalgam' },
  { pincode: '192129', area: 'Ashmuqam' },
  { pincode: '192201', area: 'Achabal' },
  { pincode: '192202', area: 'Kokarnag' },
  { pincode: '192210', area: 'Dialgam' },
  { pincode: '192211', area: 'Dooru' },
  { pincode: '192212', area: 'Verinag' },
  { pincode: '192221', area: 'Qazigund' },
  { pincode: '192401', area: 'Srigufwara' },
] as const;

export function optionalEnv(name: string) {
  return process.env[name]?.trim() || '';
}

export function storePhone() {
  return optionalEnv('STORE_PHONE');
}

export function storeEmail() {
  return optionalEnv('STORE_EMAIL');
}

export function storeAddress() {
  return optionalEnv('STORE_ADDRESS');
}

export function siteOrigin() {
  const configured =
    optionalEnv('APP_ORIGIN') ||
    (optionalEnv('VERCEL_PROJECT_PRODUCTION_URL')
      ? `https://${optionalEnv('VERCEL_PROJECT_PRODUCTION_URL')}`
      : '');
  const fallback = 'https://wholesalestore-theta.vercel.app';
  if (!configured) return fallback;
  try {
    return new URL(configured.includes('://') ? configured : `https://${configured}`).origin;
  } catch {
    return fallback;
  }
}

export type PhoneLink = { display: string; href: string };

/** A real STORE_PHONE, or null. Never invents a number. */
export function phoneLink(raw?: string | null): PhoneLink | null {
  const value = raw?.trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits || SAMPLE_PHONE_DIGITS.has(digits)) return null;
  let national = '';
  if (digits.length === 10 && /^[6-9]/.test(digits)) national = digits;
  else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1)))
    national = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2)))
    national = digits.slice(2);
  if (!national) return { display: value, href: `tel:+${digits}` };
  return {
    display: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
    href: `tel:+91${national}`,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailLink(raw?: string | null) {
  const value = raw?.trim();
  if (!value || !EMAIL_PATTERN.test(value)) return null;
  return { display: value, href: `mailto:${value}` };
}

export function publicContact() {
  return {
    live: liveMode(),
    phone: phoneLink(storePhone()),
    email: emailLink(storeEmail()),
    address: storeAddress(),
  };
}
