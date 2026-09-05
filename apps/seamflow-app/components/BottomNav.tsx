// ============================================================================
// <BottomChrome> — the persistent phone navigation: an animated bottom tab bar
// plus a small floating "Ask" pill for the assistant.
//
// The app navigates from a tile grid on phones; this gives those widths a real
// bottom bar so switching sections is one tap, not back-then-scroll. On the
// `expanded` breakpoint the <SideRail> already does this job, so the chrome
// hides there. Rendered once by (app)/_layout beside the Stack, and shown only
// on the five top-level routes (Home / Orders / Clients / Calendar / More) so
// detail screens stay full-screen.
//
// Motion (reduced-motion aware): the active pill slides + springs between tabs,
// the active icon pops, and its label reveals. Mirrors the approved mockup.
// ============================================================================

import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { useBreakpoint } from '../lib/use-breakpoint';

// Approx height the chrome occupies — screens add this as bottom padding so
// content never hides behind the bar (see BOTTOM_CHROME_SPACE users).
export const BOTTOM_CHROME_SPACE = 132;

const SPRING = { damping: 15, stiffness: 190, mass: 0.9 } as const;
const NAV_MAX_WIDTH = 480;

interface Tab {
  href: string;
  match: string[];
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

const TABS: Tab[] = [
  { href: '/(app)', match: ['/', '/(app)'], icon: 'home-outline', iconActive: 'home', labelKey: 'home.title' },
  { href: '/(app)/orders', match: ['/orders'], icon: 'list-outline', iconActive: 'list', labelKey: 'home.orders' },
  { href: '/(app)/clients', match: ['/clients'], icon: 'people-outline', iconActive: 'people', labelKey: 'home.clients' },
  { href: '/(app)/calendar', match: ['/calendar'], icon: 'calendar-outline', iconActive: 'calendar', labelKey: 'home.calendar' },
  { href: '/(app)/more', match: ['/more'], icon: 'ellipsis-horizontal', iconActive: 'ellipsis-horizontal', labelKey: 'home.more' },
];

// The chrome renders only on these exact top-level routes.
const SHOW_ON = new Set(['/', '/(app)', '/orders', '/clients', '/calendar', '/more']);

function haptic() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
}

export function BottomChrome() {
  const pathname = usePathname();
  const { isExpanded } = useBreakpoint();

  // Wide screens use the SideRail; detail/modal screens go full-bleed.
  if (isExpanded || !SHOW_ON.has(pathname)) return null;
  return <Chrome pathname={pathname} />;
}

function Chrome({ pathname }: { pathname: string }) {
  const { colors, shadows } = useAtelierTheme();
  const insets = useSafeAreaInsets();

  const active = Math.max(
    0,
    TABS.findIndex((tab) => tab.match.includes(pathname)),
  );

  const [rowW, setRowW] = useState(0);
  // Variable-width tabs: the active tab grows to hug its label, the other four
  // shrink to icon-only. The active pill (blob) hugs the active width and slides.
  const activeW = rowW > 0 ? Math.min(150, rowW * 0.42) : 0;
  const inactiveW = rowW > 0 ? (rowW - activeW) / (TABS.length - 1) : 0;
  const ready = rowW > 0;

  return (
    <View
      style={[styles.chrome, { paddingBottom: insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <View style={styles.inner} pointerEvents="box-none">
        <AskPill />
        <View
          style={[
            styles.nav,
            { backgroundColor: colors.overlay, borderColor: colors.hairline },
            shadows?.lg,
          ]}
          onLayout={(e) => setRowW(e.nativeEvent.layout.width - NAV_PAD * 2)}
        >
          {ready ? (
            <Blob
              x={active * inactiveW}
              width={activeW}
              color={colors.primary}
            />
          ) : null}
          {TABS.map((tab, i) => (
            <TabButton
              key={tab.href}
              tab={tab}
              active={i === active}
              width={ready ? (i === active ? activeW : inactiveW) : undefined}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const NAV_PAD = 8;

function Blob({ x, width, color }: { x: number; width: number; color: string }) {
  const reduce = useReducedMotion();
  const tx = useSharedValue(x);
  const w = useSharedValue(width);

  useEffect(() => {
    if (reduce) {
      tx.value = withTiming(x, { duration: 0 });
      w.value = withTiming(width, { duration: 0 });
    } else {
      tx.value = withSpring(x, SPRING);
      w.value = withSpring(width, SPRING);
    }
  }, [x, width, reduce, tx, w]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    width: w.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        style,
        { backgroundColor: withAlpha(color, 0.16), borderColor: withAlpha(color, 0.42) },
      ]}
    />
  );
}

function TabButton({
  tab,
  active,
  width,
}: {
  tab: Tab;
  active: boolean;
  width?: number;
}) {
  const { colors } = useAtelierTheme();
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const p = useSharedValue(active ? 1 : 0);
  const w = useSharedValue(width ?? 0);

  useEffect(() => {
    p.value = reduce
      ? withTiming(active ? 1 : 0, { duration: 0 })
      : withSpring(active ? 1 : 0, SPRING);
  }, [active, reduce, p]);

  useEffect(() => {
    if (width == null) return;
    w.value = reduce ? withTiming(width, { duration: 0 }) : withSpring(width, SPRING);
  }, [width, reduce, w]);

  const widthStyle = useAnimatedStyle(() => (width == null ? {} : { width: w.value }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.14 }, { translateY: -p.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    maxWidth: p.value * 90,
    opacity: p.value,
    marginStart: p.value * 7,
  }));

  return (
    <Animated.View style={[styles.tabWrap, width == null ? styles.tabFlex : null, widthStyle]}>
      <Pressable
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t(tab.labelKey)}
        onPress={() => {
          haptic();
          router.navigate(tab.href as never);
        }}
      >
        <Animated.View style={iconStyle}>
          <Ionicons
            name={active ? tab.iconActive : tab.icon}
            size={22}
            color={active ? colors.primary : colors.textMuted}
          />
        </Animated.View>
        <Animated.View style={[styles.labelWrap, labelStyle]}>
          <Text variant="bodySm" tone="primary" numberOfLines={1} style={styles.label}>
            {t(tab.labelKey)}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function AskPill() {
  const { colors, shadows } = useAtelierTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.askA11y')}
      onPress={() => {
        haptic();
        router.push('/(app)/assistant?focus=1' as never);
      }}
      style={({ pressed }) => [
        styles.ask,
        { backgroundColor: colors.primary, borderColor: withAlpha('#ffffff', 0.18) },
        shadows?.lg,
        pressed && styles.askPressed,
      ]}
    >
      <Ionicons name="sparkles" size={15} color={colors.textOnPrimary} />
      <Text variant="bodySm" style={[styles.askLabel, { color: colors.textOnPrimary }]}>
        {t('home.ask')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    zIndex: 20,
  },
  inner: {
    width: '100%',
    maxWidth: NAV_MAX_WIDTH,
    alignSelf: 'center',
  },
  ask: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingStart: 13,
    paddingEnd: 16,
    marginEnd: 2,
    marginBottom: 10,
  },
  askPressed: { transform: [{ scale: 0.94 }] },
  askLabel: { fontWeight: '600' },
  nav: {
    position: 'relative',
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: NAV_PAD,
  },
  blob: {
    position: 'absolute',
    top: NAV_PAD,
    bottom: NAV_PAD,
    left: NAV_PAD,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabWrap: { overflow: 'hidden' },
  tabFlex: { flex: 1 },
  tab: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 15,
  },
  labelWrap: { overflow: 'hidden' },
  label: { fontWeight: '600' },
});
