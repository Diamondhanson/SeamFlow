// ============================================================================
// Motion — spring-first.
//
// `react-native-reanimated` accepts these spring configs directly via
// `withSpring(value, springs.snappy)`. We keep three named springs:
//
//   soft   — page transitions, sheets, big content reveals
//   snappy — buttons, toggles, immediate-feedback motion
//   lazy   — large, decorative motion (StitchLine, illustrative reveals)
//
// Timing curves exist as a fallback for things that genuinely need linear-
// ish progression (e.g. progress bars). `ease.standard` is the only easing
// curve allowed in the system — anything else creeps in as bespoke and
// drifts over time.
// ============================================================================

export const springs = {
  soft: { damping: 18, stiffness: 180, mass: 0.9 },
  snappy: { damping: 22, stiffness: 260, mass: 0.8 },
  lazy: { damping: 26, stiffness: 120, mass: 1 },
} as const;

export const durations = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

/**
 * Reanimated v3 `withTiming` and React Native `Animated.timing` both accept
 * a 4-tuple bezier. Tailwind/CSS consumers use the `cubic-bezier(…)` string.
 */
export const easing = {
  standardBezier: [0.22, 1, 0.36, 1] as const,
  standardCss: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** Press feedback used by Button, ListRow, Tile. */
export const press = {
  scaleTo: 0.97,
  spring: springs.snappy,
} as const;

export type SpringName = keyof typeof springs;
export type DurationName = keyof typeof durations;
