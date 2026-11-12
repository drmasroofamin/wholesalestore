import type { Metadata } from 'next';
import { storeName } from '@/lib/live-config';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const name = storeName();
  const title = `${name} — Everyday essentials. Wholesale goodness.`;
  const description =
    'Fresh grains, pantry staples and honest wholesale prices. Delivered to your doorstep.';
  return {
    title,
    description,
    applicationName: name,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: name },
    openGraph: {
      title,
      description,
      siteName: name,
      type: 'website',
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
