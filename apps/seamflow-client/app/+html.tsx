// ============================================================================
// The HTML shell for the web build (`expo export --platform web`).
//
// Exists for one reason: to set `dir` on <html> BEFORE the app bundle loads.
//
// On iOS and Android, direction comes from `I18nManager.forceRTL`, which the
// native side persists and applies before React mounts. react-native-web has no
// equivalent — `I18nManager.isRTL` is `undefined` there and `forceRTL` does
// nothing. What RNW *does* honour is the `dir` attribute: it compiles
// `marginStart`/`start`/`textAlign: 'start'` down to `margin-inline-start`,
// `inset-inline-start` and `text-align: start`, all of which flip under
// `dir="rtl"`. Verified in the browser rather than assumed.
//
// So the shell reads the persisted language synchronously from localStorage
// (which is what AsyncStorage is backed by on web, under the raw key) and sets
// `dir` inline. Doing it here rather than in a component matters: the type
// scale and glyph choices are resolved at module load, so anything later is
// already too late for the first paint.
// ============================================================================

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Keep in sync with STORAGE_KEY in lib/i18n/index.tsx. */
const LANGUAGE_STORAGE_KEY = 'seamflow.language';

/** Keep in sync with the `dir` field of LANGUAGES in lib/i18n/strings.ts. */
const RTL_LANGUAGES = ['ar'];

// Inlined, not imported: this has to run before the bundle, and it must not
// throw in a context where localStorage is unavailable (private mode, SSR).
const setDirectionEarly = `
(function () {
  try {
    var lang = window.localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)});
    if (!lang) {
      var nav = (navigator.language || '').slice(0, 2);
      lang = nav;
    }
    var rtl = ${JSON.stringify(RTL_LANGUAGES)}.indexOf(lang) !== -1;
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang || 'en');
  } catch (e) {
    document.documentElement.setAttribute('dir', 'ltr');
  }
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* Before anything else, so the first paint is already the right way round. */}
        <script dangerouslySetInnerHTML={{ __html: setDirectionEarly }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
