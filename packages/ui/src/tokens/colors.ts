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
  indigo: '#2632A8', // primary (dyed thread)
  indigoSoft: '#4655D6', // hover / focus tint
  copper: '#D9673D', // accent / warm pop
  sage: '#6DA869', // secondary / success
  rose: '#C63B2C', // error / destructive
  amber: '#E89A2C', // warning
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
  lavender: '#8B7BFF', // primary (silk)
  lavSoft: '#7A69F0', // hover / focus tint
  peach: '#F2A66C', // accent / warm pop
  mint: '#55D6A0', // success
  rose: '#E9695D', // error / destructive
  amber: '#F2B646', // warning
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

  // Overlays — surfaces that float ABOVE the page (modals, sheets, dialogs).
  // `overlay` must read as a distinct, raised plane vs `bg`; `scrim` dims the
  // page behind it so the layering is obvious in both modes. In light mode the
  // sheet stays bright (near-paper) and the warm scrim does the separating.
  overlay: '#FFFDF9',
  scrim: 'rgba(26,23,20,0.45)',

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

  // Overlays — see linenSemantic. In dark mode the sheet is a clearly lighter
  // plane than the near-black page (#10101A → #2A2A3E) and the scrim is deep,
  // so a modal reads as unmistakably layered above the content.
  overlay: '#2A2A3E',
  scrim: 'rgba(0,0,0,0.72)',

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

// ----------------------------------------------------------------------------
// Color utilities
// ----------------------------------------------------------------------------

/**
 * Add an alpha channel to a color token. Accepts `#RRGGBB` (returns
 * `rgba(...)`) or an existing `rgba(r,g,b,a)` string (re-alphas it). Used for
 * tinted fills (avatar backgrounds, accent-bar washes) that need to sit at a
 * fraction of a solid semantic token without introducing a new hex literal.
 */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/**
 * Deterministic avatar tone for a name. Hashes the string to a stable index
 * into a fixed set of semantic tokens, so "Grace Mbeki" always lands on the
 * same color across sessions and screens. Returns a semantic token *name* —
 * the caller resolves it against the active theme so avatars re-skin with the
 * mode.
 */
export const AVATAR_TONES = [
  'primary',
  'accent',
  'success',
  'warning',
  'danger',
  'statusInProgress',
] as const;

export type AvatarTone = (typeof AVATAR_TONES)[number];

export function avatarToneFor(name: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

/** First letters of up to the first two words, uppercased. "Grace Mbeki" → "GM". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
