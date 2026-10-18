// ============================================================================
// LanguageProvider — owns the active UI language and a `t()` translator.
//
// Zero-dependency i18n that mirrors ThemeModeProvider: initial language comes
// from the device locale, the user's choice is persisted to AsyncStorage, and
// `useTranslation()` exposes `t`, the current `language`, and a setter for the
// Settings screen. Missing keys fall back to English, then to the raw key.
//
// This is intentionally lightweight. If we later need pluralization / ICU
// formatting, this can graduate to i18next without changing call sites much —
// `t('some.key')` stays the same.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import { IS_RTL, LANGUAGE_STORAGE_KEY } from '@seamflow/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, translations, type LanguageCode } from './strings';

// Imported rather than redeclared: the design system reads this key too,
// synchronously at module load, to decide the writing direction on web.
const STORAGE_KEY = LANGUAGE_STORAGE_KEY;

/** Best-effort device language; falls back to English. */
/**
 * Best match for the device's own locale.
 *
 * Matches on the language subtag only, so `pt-BR`, `pt-PT` and bare `pt` all
 * land on Portuguese — a Brazilian tailor should not fall back to English
 * because the region tag doesn't match one we ship.
 *
 * Derived from LANGUAGES rather than a hand-written chain of comparisons, so
 * adding a language to that list is the only edit needed.
 */
function deviceLanguage(): LanguageCode {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
    const tag = loc.toLowerCase().split(/[-_]/)[0];
    const match = LANGUAGES.find((l) => l.code === tag);
    return match ? match.code : 'en';
  } catch {
    return 'en';
  }
}

/** Walk a dot-path in a language dict; fall back to English, then the key. */
function lookup(language: LanguageCode, key: string): string {
  const read = (lang: LanguageCode): unknown =>
    key.split('.').reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      translations[lang],
    );
  const val = read(language);
  if (typeof val === 'string') return val;
  const en = read('en');
  return typeof en === 'string' ? en : key;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

interface I18nState {
  language: LanguageCode;
  /** Writing direction of the active language. */
  dir: 'ltr' | 'rtl';
  /** BCP-47 tag for the active language, for `Intl` formatting. */
  intl: string;
  /** Returns `{ requiresRestart }` — true when the direction changed. */
  setLanguage: (l: LanguageCode) => { requiresRestart: boolean };
  /** Reopen the app to apply a direction change. False when it could not. */
  reloadNow: () => Promise<boolean>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<LanguageCode>(() => deviceLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        // Validated against LANGUAGES, not a hardcoded pair: this guard used
        // to be `stored === 'en' || stored === 'fr'`, which silently rejected
        // every language added after it. The choice saved, then was thrown
        // away on the next launch and the device locale won instead.
        if (!cancelled && LANGUAGES.some((l) => l.code === stored)) {
          setLang(stored as LanguageCode);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Change language, and the layout direction with it.
   *
   * Returns whether the app must be reopened for the change to be complete.
   * The DIRECTION change is applied here and cannot be bypassed by a caller
   * ignoring that return value — what a caller can skip is only telling the
   * user about it. That ordering is deliberate: the worst case is then a
   * correct-on-next-launch app rather than a wrong-forever one.
   *
   * Why a restart at all: I18nManager.forceRTL only takes effect when the
   * native view hierarchy is recreated. It DOES persist across launches, so
   * nothing needs to be read synchronously at boot — the next cold start is
   * already correct before React mounts.
   *
   * `reloadNow()` below does the reopening for us where it can. It is kept
   * SEPARATE from this function on purpose: applying the direction must not
   * depend on a reload succeeding, so the two are ordered — store and apply
   * first, offer to reload second. A caller that ignores the reload still
   * leaves the app correct on next launch.
   */
  const setLanguage = useCallback((l: LanguageCode): { requiresRestart: boolean } => {
    setLang(l);
    void AsyncStorage.setItem(STORAGE_KEY, l);

    const nextRtl = (LANGUAGES.find((x) => x.code === l)?.dir ?? 'ltr') === 'rtl';

    // Web: RNW ignores forceRTL, but honours `dir` — see +html.tsx. Setting it
    // here means the attribute and the stored language never disagree, even
    // though the reload below is what actually re-resolves the type scale.
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', nextRtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', l);
    }

    if (nextRtl === IS_RTL) return { requiresRestart: false };

    // Both directions matter — switching OUT of Arabic has to unset it too,
    // which a one-way `if (nextRtl)` would quietly miss.
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(nextRtl);
    return { requiresRestart: true };
  }, []);

  /**
   * Reopen the app so a direction change takes effect now.
   *
   * `I18nManager.forceRTL` only lands when the native view hierarchy is
   * recreated, so Arabic (and any future RTL language) needs the app to come
   * back up. Without this the only honest thing to show was "please close and
   * reopen", which is a poor thing to say to someone who has just chosen their
   * language on the very first screen they have ever seen.
   *
   * Returns false when it could not — `reloadAsync` rejects in Expo Go, in a
   * development build, and whenever updates are disabled — and the caller then
   * falls back to asking. It never throws: a failed reload must leave the app
   * running and correct-on-next-launch, not broken.
   */
  const reloadNow = useCallback(async (): Promise<boolean> => {
    try {
      await Updates.reloadAsync();
      return true;
    } catch {
      return false;
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(lookup(language, key), vars),
    [language],
  );

  const value = useMemo<I18nState>(
    () => {
      const def = LANGUAGES.find((x) => x.code === language);
      return {
        language,
        setLanguage,
        reloadNow,
        t,
        ready,
        dir: def?.dir ?? 'ltr',
        intl: def?.intl ?? 'en-US',
      };
    },
    [language, setLanguage, reloadNow, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside LanguageProvider');
  }
  return ctx;
}

export { LANGUAGES, type LanguageCode } from './strings';
