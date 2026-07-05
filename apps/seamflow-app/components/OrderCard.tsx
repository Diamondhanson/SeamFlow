// ============================================================================
// <OrderCard> — the Atelier order row.
//
// Layout (matches the redesign):
//
//   ▏ (status accent bar)  (avatar)  Order name            [status chip]
//                                     due / overdue line     Due in 2d
//
// The left accent bar + the chip + the due line all key off the order's
// status/date, resolving colors from the active theme (no hex). Interactive:
// scale-to-0.97 press spring, matching the rest of the system.
//
// `variant="wide"` (default) is the full list card; `variant="rail"` is the
// narrower fixed-width card used in the home "Due soon" horizontal rail.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { Order } from '@seamflow/schemas';
import {
  Avatar,
  Chip,
  Text,
  useAtelierTheme,
  spacing,
  press as motionPress,
} from '@seamflow/ui';
import { STATUS_TONE, dueInfo } from '../lib/order-status';
import { useTranslation } from '../lib/i18n';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OrderCard({
  order,
  onPress,
  variant = 'wide',
}: {
  order: Pick<Order, 'orderName' | 'status' | 'dateDelivery'>;
  onPress: () => void;
  variant?: 'wide' | 'rail';
}) {
  const { t } = useTranslation();
  const theme = useAtelierTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const accent = c[STATUS_TONE[order.status]];
  const due = dueInfo(order.dateDelivery, order.status);
  const isRail = variant === 'rail';

  const surface = {
    backgroundColor: c.surface,
    borderColor: c.hairline,
    borderRadius: theme.radii.l,
  };
  const pressHandlers = {
    onPress,
    onPressIn: () => {
      scale.value = withSpring(motionPress.scaleTo, motionPress.spring);
    },
    onPressOut: () => {
      scale.value = withSpring(1, motionPress.spring);
    },
  };

  // Home "Due soon" rail — narrow, stacked card (unchanged).
  if (isRail) {
    return (
      <Animated.View style={[animatedStyle, styles.railWrap]}>
        <AnimatedPressable
          {...pressHandlers}
          accessibilityRole="button"
          style={[styles.card, surface]}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <View style={styles.inner}>
            <Avatar name={order.orderName} size="sm" />
            <Text variant="h3" numberOfLines={1} style={{ marginTop: spacing.s }}>
              {order.orderName}
            </Text>
            <View style={styles.metaRow}>
              <Chip
                variant="status"
                label={t(`orders.status_${order.status}`)}
                tone={STATUS_TONE[order.status]}
              />
              {due ? (
                <Text variant="mono" tone={due.tone} style={styles.due}>
                  {due.text}
                </Text>
              ) : null}
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  // Wide list card — compact single row: avatar · name + due · status.
  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        {...pressHandlers}
        accessibilityRole="button"
        style={[styles.card, styles.wideRow, surface]}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <Avatar name={order.orderName} size="md" />
        <View style={styles.wideMiddle}>
          <Text variant="h3" numberOfLines={1}>
            {order.orderName}
          </Text>
          {due ? (
            <Text variant="mono" tone={due.tone} numberOfLines={1} style={styles.dueWide}>
              {due.text}
            </Text>
          ) : null}
        </View>
        <Chip
          variant="status"
          label={t(`orders.status_${order.status}`)}
          tone={STATUS_TONE[order.status]}
        />
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  railWrap: { width: 220 },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  // Compact single-row layout for the wide list card.
  wideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    paddingRight: spacing.m,
    paddingLeft: spacing.m + 4, // clear the accent bar
  },
  wideMiddle: { flex: 1 },
  dueWide: { fontSize: 12, marginTop: 2 },
  // Rail (stacked) layout.
  inner: { padding: spacing.l, paddingLeft: spacing.l + 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s,
  },
  due: { fontSize: 13 },
});
