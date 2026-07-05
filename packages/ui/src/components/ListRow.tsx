// ============================================================================
// <ListRow> — Atelier list-item primitive.
//
// A tappable surface row: a tinted icon-square on the left, a title +
// (optional) subtitle in the middle, and a trailing slot (defaults to a
// chevron) on the right. This is the pattern the Templates list uses, and the
// canonical replacement for the old bordered-card lists where each item is a
// simple label + meta line.
//
//   leading  — an icon node (caller supplies; ui stays icon-agnostic). Wrapped
//              in a tinted rounded square.
//   subtitle — rendered in mono when `subtitleNumeric` (e.g. "8 fields").
//   trailing — override the default chevron; pass `null` to omit it.
//
// Interactive: scale-to-0.97 press spring, matching Card / Button / Chip.
// Colors resolve from the theme — no hex.
// ============================================================================

import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useAtelierTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { press as motionPress } from '../tokens/motion';

export interface ListRowProps
  extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  subtitle?: string;
  /** Render the subtitle in mono (tabular) — for counts like "8 fields". */
  subtitleNumeric?: boolean;
  /** Icon node placed in the tinted leading square. */
  leading?: ReactNode;
  /** Tint for the leading square (defaults to primary). */
  leadingTone?: string;
  /** Right slot. Defaults to a chevron; pass `null` to omit. */
  trailing?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ListRow = forwardRef<View, ListRowProps>(function ListRow(
  {
    title,
    subtitle,
    subtitleNumeric,
    leading,
    leadingTone,
    trailing,
    onPress,
    onPressIn,
    onPressOut,
    style,
    ...rest
  },
  ref,
) {
  const theme = useAtelierTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const tint = leadingTone ?? c.primary;

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
    onPressIn?.(e);
  };
  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scale.value = withSpring(1, motionPress.spring);
    onPressOut?.(e);
  };

  const body = (
    <>
      {leading != null ? (
        <View
          style={[
            styles.leading,
            { backgroundColor: withAlpha(tint, 0.16), borderRadius: theme.radii.s },
          ]}
        >
          {leading}
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="h3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant={subtitleNumeric ? 'mono' : 'bodySm'}
            tone="textMuted"
            style={{ marginTop: 2, fontSize: subtitleNumeric ? 13 : undefined }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing === undefined ? (
        <Text variant="h3" tone="textMuted" style={styles.chevron}>
          ›
        </Text>
      ) : (
        trailing
      )}
    </>
  );

  const surface: ViewStyle = {
    backgroundColor: c.surface,
    borderColor: c.hairline,
    borderRadius: theme.radii.l,
  };

  if (!onPress) {
    return (
      <View ref={ref} style={[styles.base, surface, style]} {...rest}>
        {body}
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        ref={ref}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.base, surface, style]}
        accessibilityRole="button"
        {...rest}
      >
        {body}
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderWidth: 1,
  },
  leading: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  text: { flex: 1 },
  chevron: { marginLeft: spacing.s, fontSize: 22, lineHeight: 24 },
});
