// ============================================================================
// Client theme — the SeamFlow Atelier system, but warm-pink instead of indigo.
//
// The ONLY change vs the tailor experience is the PRIMARY colour: the
// dyed-thread indigo / silk lavender becomes a warm rose-pink so the CLIENT
// interface reads as its own, friendlier brand. Everything else (neutrals,
// accent, status colours, type, spacing, radii, shadows) is inherited unchanged.
//
// Applied per route group: app/(client)/_layout wraps its subtree in
// <AtelierThemeProvider theme={clientTheme(mode)}>, so the tailor tree stays
// midnight and only the client tree turns pink — no bleed between them.
// (Ported from apps/seamflow-client/lib/client-theme.ts for the merged app.)
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
