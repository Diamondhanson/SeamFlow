// ============================================================================
// <SideRail> — persistent desktop navigation.
//
// The app navigates from a home tile-grid: tap a tile, drill in, come back.
// That's right for a phone, but on a wide screen there's dead space either
// side and no reason to keep returning home — so at the `expanded` breakpoint
// we park the main destinations in a rail down the left edge.
//
// Rendered by (app)/_layout beside the Stack, so it survives navigation and
// every screen keeps its own layout untouched. Hidden on phones/tablets in
// portrait, where the tile grid is still the better affordance.
// ============================================================================

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

interface RailItem {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

const ITEMS: RailItem[] = [
  { href: '/(app)', icon: 'home', labelKey: 'home.title' },
  { href: '/(app)/orders', icon: 'list', labelKey: 'home.orders' },
  { href: '/(app)/clients', icon: 'people', labelKey: 'home.clients' },
  { href: '/(app)/groups', icon: 'diamond', labelKey: 'home.groups' },
  { href: '/(app)/calendar', icon: 'calendar', labelKey: 'home.calendar' },
  { href: '/(app)/templates', icon: 'document-text', labelKey: 'home.templates' },
  { href: '/(app)/fabrics', icon: 'layers', labelKey: 'fabrics.tileLabel' },
  { href: '/(app)/designs', icon: 'color-palette', labelKey: 'home.designStudio' },
  { href: '/(app)/works', icon: 'shirt', labelKey: 'feed.worksTitle' },
  { href: '/(app)/invoices', icon: 'receipt', labelKey: 'invoices.tileLabel' },
  { href: '/(app)/messages', icon: 'chatbubbles', labelKey: 'chat.tabLabel' },
  { href: '/(app)/assistant', icon: 'sparkles', labelKey: 'home.assistant' },
];

export function SideRail() {
  const { colors } = useAtelierTheme();
  const { t } = useTranslation();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/(app)'
      ? pathname === '/' || pathname === '/(app)'
      : pathname.startsWith(href.replace('/(app)', ''));

  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: colors.surface, borderEndColor: colors.hairline },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as never)}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
              style={[
                styles.item,
                active && { backgroundColor: withAlpha(colors.primary, 0.14) },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text
                variant="bodySm"
                tone={active ? 'primary' : 'textMuted'}
                numberOfLines={1}
                style={styles.label}
              >
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 208,
    borderEndWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
  },
  list: { paddingHorizontal: spacing.sm, paddingBottom: spacing.lg, gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  label: { flexShrink: 1 },
});
