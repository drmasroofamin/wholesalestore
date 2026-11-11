import type { Metadata } from 'next';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Grain & Good — Everyday essentials. Wholesale goodness.',
  description:
    'Fresh grains, pantry staples and honest wholesale prices. Delivered to your doorstep.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
