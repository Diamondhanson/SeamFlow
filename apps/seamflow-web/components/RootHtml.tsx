import type { Lang } from '../lib/i18n';
import { DIR } from '../lib/i18n';
import { fontVariables } from '../lib/fonts';
import '../app/globals.css';

/**
 * The <html>/<body> shell, shared by all three root layouts.
 *
 * Only the topmost layout on a route's path may render <html>, and there is no
 * longer a single one: the language segment sits above it so that `lang` and
 * `dir` can be static per route tree. Without that, `dir` could only come from
 * headers() in a single root layout, which would opt all 41 prerendered routes
 * into dynamic rendering to set two attributes.
 *
 * Keeping the shell here means the three layouts cannot drift apart.
 */
export function RootHtml({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} dir={DIR[lang]} className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
