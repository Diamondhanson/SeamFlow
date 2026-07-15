// ============================================================================
// Client theme — the SeamFlow Atelier system, but warm-pink instead of indigo.
//
// Everything (linen/midnight neutrals, copper accent, sage/amber/rose statuses,
// typography, spacing, radii, shadows) is inherited unchanged from @seamflow/ui.
// The ONLY change vs the tailor app is the PRIMARY colour: the dyed-thread
// indigo / silk lavender becomes a warm rose-pink so the consumer app reads as
// its own, friendlier brand.
//
// Applied by passing `theme={clientTheme(mode)}` to <AtelierThemeProvider>.
// ============================================================================

import { createTheme, type AtelierTheme } from '@seamflow/ui';

type Mode = AtelierTheme['mode'];

// Warm rose-pink primary — distinct from the rose/tomato "danger" so error and
// brand never read as the same colour.
const PINK: Record<Mode, { primary: string; primarySoft: string }> = {
  linen: { primary: '#CE4E74', primarySoft: '#E0729A' }, // light
  midnight: { primary: '#F090AE', primarySoft: '#E88AAA' }, // dark
};

export function clientTheme(mode: Mode): AtelierTheme {
  const base = createTheme(mode);
  const p = PINK[mode];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: p.primary,
      primarySoft: p.primarySoft,
      // Keep the "in progress" status pill on-brand with the pink primary.
      statusInProgress: p.primary,
    },
  } as AtelierTheme;
}
