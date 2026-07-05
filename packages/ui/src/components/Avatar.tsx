// ============================================================================
// <Avatar> / <AvatarStack> — Atelier identity primitive.
//
// A circular initials badge with a deterministic, name-derived tone: the same
// person always gets the same color across screens. The tone resolves from the
// active theme, so avatars re-skin with the mode. Fill is a soft wash of the
// tone; the initials + ring take the solid tone.
//
//   <Avatar name="Grace Mbeki" />         → "GM", stable color
//   <AvatarStack names={[...]} max={4} />  → overlapping cluster (group cards)
//
// No hex literals — colors come from `avatarToneFor` + `withAlpha` over the
// theme's semantic tokens.
// ============================================================================

import { forwardRef } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAtelierTheme } from '../theme/ThemeProvider';
import {
  avatarToneFor,
  initialsFor,
  withAlpha,
  type TypeVariant,
} from '../tokens';

export type AvatarSize = 'sm' | 'md' | 'lg';

const DIAMETER: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 56 };
const TEXT_VARIANT: Record<AvatarSize, TypeVariant> = {
  sm: 'label',
  md: 'bodySm',
  lg: 'h3',
};

export interface AvatarProps {
  /** Person / entity name — drives both the initials and the color. */
  name: string;
  size?: AvatarSize;
  /** Override the auto tone with an explicit hex/color (rare). */
  color?: string;
  /** Draw a ring in the surrounding surface color — used inside stacks so
   *  overlapping avatars read as separate discs. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const Avatar = forwardRef<View, AvatarProps>(function Avatar(
  { name, size = 'md', color, ringColor, style },
  ref,
) {
  const { colors } = useAtelierTheme();
  const tone = color ?? colors[avatarToneFor(name)];
  const d = DIAMETER[size];

  return (
    <View
      ref={ref}
      style={[
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: withAlpha(tone, 0.18),
          borderColor: ringColor ?? withAlpha(tone, 0.45),
          borderWidth: ringColor ? 2 : 1,
        },
        styles.center,
        style,
      ]}
      accessibilityLabel={name}
    >
      <Text variant={TEXT_VARIANT[size]} style={{ color: tone }}>
        {initialsFor(name)}
      </Text>
    </View>
  );
});

export interface AvatarStackProps {
  names: string[];
  /** Max avatars to show before collapsing the rest into a "+N" disc. */
  max?: number;
  size?: AvatarSize;
  /** Surface the stack sits on — used to draw separating rings. Defaults to
   *  the screen surface token. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function AvatarStack({
  names,
  max = 4,
  size = 'sm',
  ringColor,
  style,
}: AvatarStackProps) {
  const { colors } = useAtelierTheme();
  const ring = ringColor ?? colors.surface;
  const d = DIAMETER[size];
  const overlap = Math.round(d * 0.36);

  const shown = names.slice(0, max);
  const extra = names.length - shown.length;

  return (
    <View style={[styles.row, style]}>
      {shown.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          size={size}
          ringColor={ring}
          style={i === 0 ? undefined : { marginLeft: -overlap }}
        />
      ))}
      {extra > 0 ? (
        <View
          style={[
            {
              width: d,
              height: d,
              borderRadius: d / 2,
              marginLeft: -overlap,
              backgroundColor: colors.surfaceElevated,
              borderColor: ring,
              borderWidth: 2,
            },
            styles.center,
          ]}
        >
          <Text variant="label" tone="textMuted">{`+${extra}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
