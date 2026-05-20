// ============================================================================
// 4px-based spacing scale.
//
// Names are size-ordered (xs → 4xl) so call sites read like CSS gap utility
// classes. All gaps/margins/paddings across the app must pull from this
// scale — no raw `marginTop: 13` anywhere in screen code.
// ============================================================================

export const spacing = {
  none: 0,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;
