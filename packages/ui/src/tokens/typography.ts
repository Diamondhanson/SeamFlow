import { I18nManager } from 'react-native';

/**
 * Whether the UI is laid out right-to-left.
 *
 * Coerced explicitly, because `I18nManager.isRTL` is a boolean on iOS and
 * Android but `undefined` under react-native-web — so `isRTL ? a : b` silently
 * takes the Latin branch in the browser build.
 *
 * KNOWN GAP: that means the Arabic type scale does not activate in the web
 * export (app.seamflowtech.com), and Arabic there falls back to whatever font
 * the OS supplies. RNW does not honour `forceRTL` either, so a proper fix means
 * driving `document.dir` from the language — a separate piece of work on that
 * deployment, tracked rather than hidden behind a falsy value.
 */
export const IS_RTL: boolean = I18nManager.isRTL === true;

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

/** The shape every type-scale entry satisfies. */
export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform?: 'uppercase';
  /**
   * Mirrors React Native's `FontVariant`. Spelled out rather than imported so
   * this token file stays free of a react-native dependency — but widening it
   * to `string[]` would make the Text primitive stop compiling, which is how
   * this got noticed.
   */
  fontVariant?: readonly (
    | 'small-caps'
    | 'oldstyle-nums'
    | 'lining-nums'
    | 'tabular-nums'
    | 'proportional-nums'
  )[];
}

// ── Arabic ──────────────────────────────────────────────────────────────────
// None of the three Latin families above has Arabic coverage, so Arabic text
// would fall back to whatever the OS supplies (Geeza Pro on iOS, Noto Naskh on
// Android) — losing the brand type identity entirely, and mixing fonts within a
// line wherever a Latin fragment appears.
//
// Mono is deliberately NOT swapped. Digits stay Western, so JetBrains Mono
// still covers them and the tabular alignment that keeps chest / waist / hips
// lined up in a column survives.
export const arabicFontFamilies = {
  display: 'NotoKufiArabic_600SemiBold',
  displayBold: 'NotoKufiArabic_700Bold',
  body: 'IBMPlexSansArabic_400Regular',
  bodyMedium: 'IBMPlexSansArabic_500Medium',
  bodySemibold: 'IBMPlexSansArabic_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

/** Latin family name -> its Arabic counterpart. */
const ARABIC_EQUIVALENT: Record<string, string> = {
  [fontFamilies.display]: arabicFontFamilies.display,
  [fontFamilies.displayBold]: arabicFontFamilies.displayBold,
  [fontFamilies.body]: arabicFontFamilies.body,
  [fontFamilies.bodyMedium]: arabicFontFamilies.bodyMedium,
  [fontFamilies.bodySemibold]: arabicFontFamilies.bodySemibold,
};

/**
 * The same scale, adjusted for Arabic. Derived from `typeScale` rather than
 * written out, so a change to the Latin scale cannot silently skip Arabic.
 *
 * Two adjustments, both required rather than stylistic:
 *
 *  - `letterSpacing: 0`. Arabic is cursive — the letters within a word are
 *    joined. Negative tracking (display, h1) crushes those joins; positive
 *    tracking (label, button) can break the connections outright on Android.
 *    That is a rendering defect, not a matter of taste.
 *  - `lineHeight` x1.15. Arabic ascenders, descenders and diacritics need more
 *    vertical room than Latin at the same nominal size, and `label` at 12/16
 *    is already tight.
 *
 * `textTransform: 'uppercase'` on `label` is left as-is: Arabic has no case, so
 * it is a harmless no-op, and stripping it would only add a branch.
 */
export const arabicTypeScale = Object.fromEntries(
  Object.entries(typeScale).map(([name, v]) => [
    name,
    {
      ...v,
      fontFamily: ARABIC_EQUIVALENT[v.fontFamily] ?? v.fontFamily,
      letterSpacing: 0,
      lineHeight: Math.round(v.lineHeight * 1.15),
    },
  ]),
) as Record<keyof typeof typeScale, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

/**
 * The families actually in force for this launch, already resolved for the
 * current writing direction.
 *
 * `<Text>` gets this for free via the type scale. These exist for the handful
 * of places that cannot use `<Text>` — mostly `TextInput`, plus the markdown
 * renderer — and which previously hardcoded `'Inter_400Regular'`, silently
 * opting themselves out of any font decision made at the token layer.
 */
export const activeFontFamilies: Record<keyof typeof fontFamilies, string> = IS_RTL
  ? arabicFontFamilies
  : fontFamilies;
