import type { MetadataRoute } from 'next';
import { SITE } from '../lib/i18n';

export default function robots(): MetadataRoute.Robots {
  return {
    // Index the marketing + legal pages; keep the private share/invoice token
    // pages out of search results.
    //
    // /t/ (tailor catalogues) is deliberately NOT disallowed. Unlike /o/ and
    // /i/, a catalogue is world-readable by design and being findable is most
    // of its value to the tailor — that is the whole difference between this
    // link and a share token.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/o/', '/i/'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
