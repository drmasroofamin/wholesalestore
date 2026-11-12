import type { Metadata } from 'next';
import { storeName } from '@/lib/live-config';
import { siteOrigin } from '@/lib/store-profile';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  const title = `${name} — Everyday essentials in Anantnag`;
  const description = `${name} sells rice, atta, pulses, oil, sugar, millets and biscuits in Anantnag, Jammu & Kashmir. Prices are in INR. Delivery is within Anantnag district.`;
  const origin = siteOrigin();
  return {
    metadataBase: new URL(origin),
    title: { default: title, template: `%s — ${name}` },
    description,
    applicationName: name,
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/favicon.ico' }, { url: '/icon.svg', type: 'image/svg+xml' }] },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: name },
    alternates: { canonical: origin },
    openGraph: {
      title,
      description,
      siteName: name,
      type: 'website',
      url: origin,
      locale: 'en_IN',
    },
  };
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
