import type { MetadataRoute } from 'next';
import { SITE, withLang, LANGS } from '../lib/i18n';

// Both languages are listed as their own entries — they're separate URLs with
// separate content, and omitting one is the usual reason a translated site
// never gets indexed. Each entry also declares the full alternates set, which
// is what tells Google the two are translations rather than competitors.
const ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/tailor-assistant', priority: 0.9 },
  { path: '/alternatives/tailor-assist', priority: 0.8 },
  { path: '/support', priority: 0.6 },
  { path: '/privacy', priority: 0.4 },
  { path: '/terms', priority: 0.4 },
  // Google Play requires this be reachable without installing the app, which
  // means it has to be indexable too, not just linked from the footer.
  { path: '/delete-account', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return ROUTES.flatMap(({ path, priority }) => {
    // Identical on every entry for a given path — both languages point at the
    // same reciprocal set, which is what makes the annotation valid.
    const languages = Object.fromEntries(
      LANGS.map((l) => [l, `${SITE.url}${withLang(path, l)}`]),
    );

    return LANGS.map((lang) => ({
      url: `${SITE.url}${withLang(path, lang)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      // The French variants sit just below their English counterparts rather
      // than competing with them at the same weight.
      priority: lang === 'en' ? priority : Math.max(0.1, priority - 0.1),
      alternates: { languages },
    }));
  });
}
