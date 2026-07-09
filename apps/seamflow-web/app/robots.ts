import type { MetadataRoute } from 'next';
import { SITE } from '../lib/i18n';

export default function robots(): MetadataRoute.Robots {
  return {
    // Index the marketing + legal pages; keep the private share/invoice token
    // pages out of search results.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/o/', '/i/'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
