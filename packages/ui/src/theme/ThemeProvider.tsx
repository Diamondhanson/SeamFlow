// ============================================================================
// ThemeProvider — gives every Atelier primitive access to the active theme
// (linen or midnight). Apps wrap their root with <AtelierThemeProvider>.
//
// We deliberately do NOT depend on `@shopify/restyle`'s context here even
// though the package is in the workspace — the Restyle types are heavy and
// Restyle's `useTheme` requires a global type augmentation that has to live
// in the consuming app. Keeping our own thin provider means tokens are
// usable from `packages/ui` without any consumer setup.
//
// Apps can still use Restyle on top if they want — see the createTheme()
// shape in tokens/theme.ts.
// ============================================================================

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createTheme,
  type AtelierTheme,
  linenTheme,
  midnightTheme,
} from '../tokens/theme';
import type { ColorMode } from '../tokens/colors';

const ThemeContext = createContext<AtelierTheme>(midnightTheme);

export interface AtelierThemeProviderProps {
  mode?: ColorMode;
  /** Pass a pre-built theme to skip the createTheme() call. */
  theme?: AtelierTheme;
  children: ReactNode;
}

export function AtelierThemeProvider({
  mode,
  theme,
  children,
}: AtelierThemeProviderProps) {
  const value = useMemo<AtelierTheme>(() => {
    if (theme) return theme;
    if (mode === 'linen') return linenTheme;
    if (mode === 'midnight') return midnightTheme;
    // Fallback — the tailor app defaults to midnight.
    return midnightTheme;
  }, [mode, theme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAtelierTheme(): AtelierTheme {
  return useContext(ThemeContext);
}

/** Convenience — re-export the factory + named themes from the same module. */
export { createTheme, linenTheme, midnightTheme };
