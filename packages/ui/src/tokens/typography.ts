// ============================================================================
// Type system — three families, one scale.
//
//   Display    — `Fraunces` (variable serif). Screen titles, hero headlines.
//   UI / body  — `Inter` (variable sans). Labels, body, buttons, navigation.
//   Numeric    — `JetBrains Mono` with tabular figures. ONLY for measurement
//                values, prices, and stat displays. Application code that
//                wants tabular numbers uses `<Text numeric>`, never raw mono.
//
// Why three families: Fraunces signals craft (the wordmark), Inter is the
// workhorse, JetBrains Mono with `variant-numeric: tabular-nums` keeps
// measurement columns visually aligned — a 0 takes the same width as a 9,
// which matters when chest / waist / hips stack vertically.
// ============================================================================

/** Font family names — wired to fonts loaded via `@expo-google-fonts/*`. */
export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

/** Mobile type scale. fontSize/lineHeight pairs that the Text primitive uses. */
export const typeScale = {
  display: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.25,
  },
  h2: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fontFamilies.bodySemibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  /** All-caps subhead / form labels. */
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  button: {
    fontFamily: fontFamilies.bodySemibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  /** Tabular numerals — measurement values, prices. */
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
    // RN doesn't honor fontVariant on Android pre-Hermes-on-new-arch reliably.
    // The chosen JetBrains Mono build ships tabular by default.
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

export type TypeVariant = keyof typeof typeScale;
