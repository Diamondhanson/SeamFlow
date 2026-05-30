// ============================================================================
// ThemeModeProvider — owns the user's light/dark preference and resolves it
// to a concrete Atelier color mode (`linen` | `midnight`).
//
// Preference is one of:
//   'system' — follow the OS appearance (default)
//   'light'  — force linen
//   'dark'   — force midnight
//
// The choice is persisted to AsyncStorage so it survives restarts. Until the
// stored value loads we render with the OS-derived default, so there's no
// flash of the wrong theme on cold start.
//
// `useThemeMode()` exposes the resolved `mode` (fed into AtelierThemeProvider)
// plus the raw `preference` + a setter for the settings screen.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorMode } from '@seamflow/ui';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'seamflow.theme.preference';

interface ThemeModeState {
  /** Raw user choice — what the settings screen toggles. */
  preference: ThemePreference;
  /** Resolved Atelier mode after applying the OS scheme for 'system'. */
  mode: ColorMode;
  /** Persist + apply a new preference. */
  setPreference: (p: ThemePreference) => void;
  /** Has the stored preference finished loading? */
  ready: boolean;
}

const ThemeModeContext = createContext<ThemeModeState | null>(null);

function resolveMode(preference: ThemePreference, system: 'light' | 'dark' | null): ColorMode {
  // The tailor app's historical default is dark, so an unknown OS scheme
  // (null) falls back to dark rather than light.
  const effective = preference === 'system' ? system ?? 'dark' : preference;
  return effective === 'light' ? 'linen' : 'midnight';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  // Load the persisted preference once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (stored === 'system' || stored === 'light' || stored === 'dark')
        ) {
          setPref(stored);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPref(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  };

  // useColorScheme() can return 'light' | 'dark' | null | undefined (and the
  // RN type also admits 'unspecified') — collapse anything that isn't a real
  // light/dark signal to null so resolveMode falls back to the dark default.
  const normalizedSystem = system === 'light' || system === 'dark' ? system : null;
  const mode = useMemo(
    () => resolveMode(preference, normalizedSystem),
    [preference, normalizedSystem],
  );

  const value = useMemo<ThemeModeState>(
    () => ({ preference, mode, setPreference, ready }),
    [preference, mode, ready],
  );

  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeState {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used inside ThemeModeProvider');
  }
  return ctx;
}
