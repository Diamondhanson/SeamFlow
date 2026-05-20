// ============================================================================
// Corner radii scale — soft, "atelier" feel. Inputs land at 14 (m); cards
// at 20 (l). Pill = full round, used by chips / circular icon buttons.
// ============================================================================

export const radii = {
  none: 0,
  xs: 6,
  s: 10,
  m: 14,
  l: 20,
  xl: 24,
  '2xl': 32,
  pill: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
