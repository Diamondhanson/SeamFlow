// ============================================================================
// createTheme() — single factory that returns an Atelier theme object for
// the given mode. Consumed by:
//
//   - Restyle (React Native): the returned shape includes `colors`,
//     `spacing`, `radii`, `textVariants`, `shadows` keys that Restyle's
//     `createTheme()` expects. Pass through unchanged.
//   - CSS variables (future web): `toCssVariables(theme)` flattens the
//     same tokens into `--atelier-color-primary` etc. for next-themes /
//     Tailwind preset consumption.
//
// Names are stable across modes: `theme.colors.primary` is lavender in
// midnight and indigo in linen. Application code never branches on mode.
// ============================================================================

import { semanticForMode, type ColorMode } from './colors';
import { spacing } from './spacing';
import { radii } from './radii';
import { typeScale } from './typography';
import { linenShadows, midnightShadows, type ShadowToken } from './shadows';

export interface AtelierTheme {
  mode: ColorMode;
  colors: ReturnType<typeof semanticForMode>;
  spacing: typeof spacing;
  radii: typeof radii;
  textVariants: typeof typeScale;
  shadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowToken>;
  /** Border widths — kept tiny because the system favours hairlines. */
  borderWidths: { hairline: 1; default: 1.5; focus: 2 };
}

export function createTheme(mode: ColorMode): AtelierTheme {
  return {
    mode,
    colors: semanticForMode(mode),
    spacing,
    radii,
    textVariants: typeScale,
    shadows: mode === 'linen' ? linenShadows : midnightShadows,
    borderWidths: { hairline: 1, default: 1.5, focus: 2 },
  };
}

export const linenTheme = createTheme('linen');
export const midnightTheme = createTheme('midnight');

// ----------------------------------------------------------------------------
// CSS-variables export — staged for the future web apps.
// ----------------------------------------------------------------------------

/**
 * Flatten an Atelier theme into `--atelier-*` CSS custom properties. Web
 * apps inject this into a `<style>` block scoped to `[data-theme="linen"]`
 * or `[data-theme="midnight"]` so the same component code can swap modes
 * by toggling a single attribute on `<html>`.
 *
 * Not used by seamflow-app today (RN doesn't speak CSS vars), but kept
 * in sync so the day seamflow-web ships there's nothing to wire.
 */
export function toCssVariables(theme: AtelierTheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.colors)) {
    out[`--atelier-color-${kebab(k)}`] = String(v);
  }
  for (const [k, v] of Object.entries(theme.spacing)) {
    out[`--atelier-spacing-${k}`] = `${v}px`;
  }
  for (const [k, v] of Object.entries(theme.radii)) {
    out[`--atelier-radius-${k}`] = `${v}px`;
  }
  return out;
}

function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
