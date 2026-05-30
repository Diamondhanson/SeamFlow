// ============================================================================
// Back-compat shim — the tailor app's old `lib/theme.ts` API.
//
// Every existing screen imports `{ colors, spacing, radii }` from here with
// the legacy key names (`colors.bg`, `colors.card`, `radii.lg`, …). Rather
// than rewrite 180+ call sites in one go we map the legacy keys onto the
// new Atelier midnight palette so the visual identity flips with this
// single change. Screens then migrate incrementally to the new primitives
// (`<Text variant=… tone=…>`, `<Button variant=…>`, …), at which point
// their direct theme imports disappear.
//
// New code should `import { useAtelierTheme } from '@seamflow/ui'` and
// read `theme.colors.<semantic-name>` directly.
// ============================================================================

import { useMemo } from 'react';
import {
  midnightSemantic,
  spacing as atelierSpacing,
  radii as atelierRadii,
  useAtelierTheme,
} from '@seamflow/ui';

/**
 * Reactive equivalent of the static `colors` export below. Reads the *active*
 * Atelier theme from context so it flips when the user switches light/dark.
 *
 * Use this inside components for any color that lives in a background, border,
 * divider, or icon tint. (Text colors should prefer `<Text tone=…>`, which is
 * already theme-reactive.) Keys mirror the legacy `colors` shape so call sites
 * read identically — `colors.card`, `colors.accent`, … — they just come from a
 * hook now instead of a frozen module constant.
 */
export function useThemeColors() {
  const { colors: c } = useAtelierTheme();
  return useMemo(
    () =>
      ({
        bg: c.bg,
        card: c.surface,
        cardElevated: c.surfaceElevated,
        border: c.border,
        hairline: c.hairline,
        text: c.text,
        textMuted: c.textMuted,
        accentText: c.textOnPrimary,
        accent: c.primary,
        danger: c.danger,
        success: c.success,
        warning: c.warning,
      }) as const,
    [c],
  );
}

/**
 * Static `colors` object — frozen to the midnight palette. ONLY safe for the
 * pre-provider cold-start splash (before AtelierThemeProvider mounts). Every
 * in-app surface should use `useThemeColors()` so it reacts to the active
 * theme. Each key maps to an Atelier semantic token.
 */
export const colors = {
  bg: midnightSemantic.bg,
  card: midnightSemantic.surface,
  cardElevated: midnightSemantic.surfaceElevated,
  border: midnightSemantic.border,
  text: midnightSemantic.text,
  textMuted: midnightSemantic.textMuted,
  // Was `'#ffffff'` — now the warm cream that sits on a primary fill.
  accentText: midnightSemantic.textOnPrimary,
  // Was `'#7c5cff'` — now Atelier silk lavender. Existing code that uses
  // `colors.accent` for "primary action" picks up the new color for free.
  accent: midnightSemantic.primary,
  danger: midnightSemantic.danger,
  success: midnightSemantic.success,
} as const;

/** Legacy `radii` keys mapped to Atelier scale (sm/md/lg → xs/s/l). */
export const radii = {
  sm: atelierRadii.xs, // 6
  md: atelierRadii.s, // 10
  lg: atelierRadii.l, // 20
} as const;

/** Legacy `spacing` keys mapped to Atelier scale. */
export const spacing = {
  xs: atelierSpacing.xs, // 4
  sm: atelierSpacing.s, // 8
  md: atelierSpacing.m, // 12
  lg: atelierSpacing.l, // 16
  xl: atelierSpacing.xl, // 24
} as const;
