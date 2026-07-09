import type { MetadataRoute } from 'next';
import { SITE } from '../lib/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', '/privacy', '/terms', '/support'];
  return routes.map((r) => ({
    url: `${SITE.url}${r}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: r === '' ? 1 : 0.6,
  }));
}
