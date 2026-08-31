import { I18nManager } from 'react-native';

/**
 * Whether the UI is laid out right-to-left.
 *
 * Two sources, because the platforms answer differently:
 *
 *  - Native: `I18nManager.isRTL`, set by `forceRTL` and persisted by the OS, so
 *    it is already correct before React mounts.
 *  - Web: `I18nManager.isRTL` is `undefined` under react-native-web and
 *    `forceRTL` does nothing, so the answer comes from the `dir` attribute
 *    instead — which the app's `+html.tsx` shell sets from the stored language
 *    before the bundle loads, for exactly this reason.
 *
 * Coerced with `=== true` rather than truthiness, because `undefined ? a : b`
 * silently taking the Latin branch is the bug this replaced.
 */
/**
 * Where the apps persist the chosen language. Shared with the app's i18n
 * provider (which imports it from here) so the two cannot drift — this module
 * has to read it directly, see below.
 */
export const LANGUAGE_STORAGE_KEY = 'seamflow.language';

/** Language codes that read right-to-left. */
export const RTL_LANGUAGE_CODES = ['ar'] as const;

function detectRtl(): boolean {
  // Native: set by forceRTL, persisted by the OS, correct before React mounts.
  if (I18nManager.isRTL === true) return true;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

  // Web: read the stored language directly rather than the `dir` attribute.
  // `dir` would work, but only if it were set before this module is evaluated —
  // and that is a module-load-ORDER dependency, which is exactly the kind of
  // thing that works locally and breaks in a production bundle. localStorage is
  // synchronous and order-independent, so there is nothing to get wrong.
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = stored || (typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : '');
    return (RTL_LANGUAGE_CODES as readonly string[]).includes(lang);
  } catch {
    return false; // private mode, storage disabled
  }
}

export const IS_RTL: boolean = detectRtl();

// react-native-web ignores forceRTL but honours `dir`, so set it here — at the
// same moment the direction is decided, rather than hoping some other module
// runs first.
if (typeof document !== 'undefined') {
  document.documentElement?.setAttribute('dir', IS_RTL ? 'rtl' : 'ltr');
}

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
