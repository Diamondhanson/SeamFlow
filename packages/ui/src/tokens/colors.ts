// ============================================================================
// Atelier palette — two modes, same DNA.
//
//   "Linen"     — light mode, default for the customer-facing surfaces
//                 (seamflow-web, seamflow-client). Warm cream paper feel.
//   "Midnight"  — dark mode, default for the tailor mobile app
//                 (seamflow-app). Warm near-black with dyed-thread accents.
//
// Rules baked in:
//   - No pure black (#000000) — text uses `ink` or `cream`.
//   - No pure white (#FFFFFF) — backgrounds use `linen` or `midnight`.
//   - No RGB-pure primaries — primary is dyed-thread indigo (light) or
//     silk lavender (dark).
//   - Every legacy `#0000ff` instance is dead on sight.
//
// Token names are stable across modes — call sites use `colors.primary`,
// not `colors.indigo`, so swapping modes never touches application code.
// ============================================================================

/** Light-mode raw palette. */
export const linen = {
  base: '#FAF7F2',
  paper: '#F1ECE3',
  surface: '#F1ECE3', // alias of paper for cross-mode parity
  surface2: '#E9E2D3', // slightly deeper card / elevated
  clay: '#D9C6AE', // warm neutral chip / divider tint
  ink: '#1A1714', // primary text — warm near-black, never #000
  inkMuted: '#5B554F', // secondary text
  indigo: '#2E3A8C', // primary (dyed thread)
  indigoSoft: '#5764B8', // hover / focus tint
  copper: '#C97B5C', // accent / warm pop
  sage: '#8FA68E', // secondary / success
  rose: '#B4564B', // error / destructive
  amber: '#D89F4A', // warning
  hairline: 'rgba(26,23,20,0.08)',
} as const;

/** Dark-mode raw palette. */
export const midnight = {
  base: '#10101A',
  paper: '#1A1A26', // surface alias
  surface: '#1A1A26',
  surface2: '#232333', // elevated card
  clay: '#2F2F40', // dark equivalent of the clay neutral
  cream: '#F2F0EB', // primary text — warm white, never #FFF
  creamMuted: '#A5A3A0',
  lavender: '#A89CFF', // primary (silk)
  lavSoft: '#877BD9', // hover / focus tint
  peach: '#E6B796', // accent / warm pop
  mint: '#7FD9B8', // success
  rose: '#E08B82', // error / destructive
  amber: '#E8B96A', // warning
  hairline: 'rgba(242,240,235,0.08)',
} as const;

// ----------------------------------------------------------------------------
// Semantic token sets — what application code consumes. Stable names across
// modes so call sites never branch on theme.
// ----------------------------------------------------------------------------

/** Semantic tokens — light mode. */
export const linenSemantic = {
  // Surfaces
  bg: linen.base,
  surface: linen.surface,
  surfaceElevated: linen.surface2,

  // Text
  text: linen.ink,
  textMuted: linen.inkMuted,
  textOnPrimary: '#FAF7F2',

  // Lines + dividers
  hairline: linen.hairline,
  border: linen.clay,

  // Primary + accents
  primary: linen.indigo,
  primarySoft: linen.indigoSoft,
  accent: linen.copper,
  success: linen.sage,
  warning: linen.amber,
  danger: linen.rose,

  // Status badges (used by order pills)
  statusRegistered: linen.inkMuted,
  statusInProgress: linen.indigo,
  statusTesting: linen.amber,
  statusOnPause: linen.rose,
  statusDelivered: linen.sage,
} as const;

/** Semantic tokens — dark mode. */
export const midnightSemantic = {
  bg: midnight.base,
  surface: midnight.surface,
  surfaceElevated: midnight.surface2,

  text: midnight.cream,
  textMuted: midnight.creamMuted,
  textOnPrimary: midnight.base,

  hairline: midnight.hairline,
  border: midnight.clay,

  primary: midnight.lavender,
  primarySoft: midnight.lavSoft,
  accent: midnight.peach,
  success: midnight.mint,
  warning: midnight.amber,
  danger: midnight.rose,

  statusRegistered: midnight.creamMuted,
  statusInProgress: midnight.lavender,
  statusTesting: midnight.amber,
  statusOnPause: midnight.rose,
  statusDelivered: midnight.mint,
} as const;

/** Mode names — used by createTheme() and consumers. */
export type ColorMode = 'linen' | 'midnight';

export type SemanticColors =
  | typeof linenSemantic
  | typeof midnightSemantic;

/** Get semantic tokens for a given mode. */
export function semanticForMode(mode: ColorMode): SemanticColors {
  return mode === 'linen' ? linenSemantic : midnightSemantic;
}
