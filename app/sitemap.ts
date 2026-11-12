import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, siteOrigin } from '@/lib/store-profile';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const paths = ['/', ...PUBLIC_PAGES.map((page) => page.href)];
  return paths.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
