import type { MetadataRoute } from 'next';
import { storeName } from '@/lib/live-config';
export const dynamic = 'force-dynamic';
export default function manifest(): MetadataRoute.Manifest {
  const name = storeName();
  return {
    name,
    short_name: name,
    description: 'Your everyday essentials. Wholesale goodness.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f8f3',
    theme_color: '#294e3c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
