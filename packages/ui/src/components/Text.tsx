// ============================================================================
// <Text> — Atelier text primitive.
//
// Props:
//   variant   — one of the type-scale names (`display`, `h1`…`mono`).
//               Default `body`.
//   tone      — semantic color token name (`text`, `textMuted`, `primary`,
//               `accent`, `success`, `warning`, `danger`, etc). Default `text`.
//   numeric   — if true, overrides variant to `mono` so measurement values
//               line up tabularly even when the surrounding text is sans.
//
// Web rendering note: future seamflow-web will render this as a plain
// <span> with a `data-variant="…" data-tone="…"` attribute that Tailwind /
// CSS selectors style off — same names, same look.
// ============================================================================

import { forwardRef } from 'react';
import { I18nManager, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { typeScale, arabicTypeScale, type TypeVariant } from '../tokens/typography';
import type { SemanticColors } from '../tokens/colors';
import { useAtelierTheme } from '../theme/ThemeProvider';

type ToneKey = keyof SemanticColors;

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: ToneKey;
  /** Shortcut for tabular numerals — equivalent to variant="mono". */
  numeric?: boolean;
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = 'body', tone = 'text', numeric, style, ...rest },
  ref,
) {
  const theme = useAtelierTheme();
  const effectiveVariant: TypeVariant = numeric ? 'mono' : variant;
  // Arabic needs its own families, zero tracking and more leading — see
  // arabicTypeScale. Direction only changes across an app restart, so which
  // scale applies is fixed for the lifetime of the process.
  const v = (I18nManager.isRTL ? arabicTypeScale : typeScale)[effectiveVariant];
  const color = theme.colors[tone];

  // Build the base style explicitly typed so the `readonly` tuple in
  // `fontVariant` (from `as const` in tokens) widens cleanly to RN's
  // TextStyle expectations.
  const base: TextStyle = {
    color,
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    letterSpacing: v.letterSpacing,
    // Stated rather than left to the platform default. Almost every string in
    // this app mixes scripts — an Arabic label beside a Latin order number,
    // business name or phone number — and without an explicit base direction
    // the bidi algorithm resolves punctuation from the first strong character
    // in the run, which lands full stops and colons on the wrong side.
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  };
  if ('textTransform' in v && v.textTransform) {
    base.textTransform = v.textTransform;
  }
  if ('fontVariant' in v && v.fontVariant) {
    base.fontVariant = [...v.fontVariant];
  }

  return <RNText ref={ref} style={[base, style]} {...rest} />;
});
