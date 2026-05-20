// ============================================================================
// Shadows — soft, layered, warm-tinted.
//
// Light mode ("Linen") uses real shadows derived from `ink` so cards lift
// off the warm paper background. Dark mode ("Midnight") relies almost
// entirely on surface elevation (surface vs surface2) and uses near-zero
// shadows — pure black shadows on a dark background read as muddy, and
// the surface contrast does the job.
//
// Shape: React Native's box-shadow lives across `shadowColor`,
// `shadowOpacity`, `shadowOffset`, `shadowRadius` (iOS) + `elevation`
// (Android). We keep both in sync per token so the shadow looks the same
// on both platforms.
// ============================================================================

export interface ShadowToken {
  shadowColor: string;
  shadowOpacity: number;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  elevation: number;
}

const ZERO: ShadowToken = {
  shadowColor: '#000000',
  shadowOpacity: 0,
  shadowOffset: { width: 0, height: 0 },
  shadowRadius: 0,
  elevation: 0,
};

/** Light-mode shadows — warm, derived from ink. */
export const linenShadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowToken> = {
  none: ZERO,
  sm: {
    shadowColor: '#1A1714',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1714',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1714',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1A1714',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 56,
    elevation: 16,
  },
};

/**
 * Dark-mode shadows — minimal, defer to surface elevation. We keep the
 * keys in parity with light so consumers don't branch on mode.
 */
export const midnightShadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowToken> = {
  none: ZERO,
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 48,
    elevation: 16,
  },
};

export type ShadowLevel = keyof typeof linenShadows;
