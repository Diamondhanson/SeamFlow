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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type LanguageCode } from './strings';

const STORAGE_KEY = 'seamflow.language';

/** Best-effort device language; falls back to English. */
function deviceLanguage(): LanguageCode {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
    return loc.toLowerCase().startsWith('fr') ? 'fr' : 'en';
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
  setLanguage: (l: LanguageCode) => void;
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
        if (!cancelled && (stored === 'en' || stored === 'fr')) setLang(stored);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((l: LanguageCode) => {
    setLang(l);
    void AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(lookup(language, key), vars),
    [language],
  );

  const value = useMemo<I18nState>(
    () => ({ language, setLanguage, t, ready }),
    [language, setLanguage, t, ready],
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
