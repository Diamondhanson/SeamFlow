// ============================================================================
// "More" — the long-tail launcher.
//
// The bottom bar promotes Home / Orders / Clients / Calendar to one tap each;
// everything else that used to crowd the home tile grid lives here, as the same
// familiar tiles. Reachable from the "More" tab and the home "Shortcuts → More".
// ============================================================================

import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { type SemanticColors } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Tile } from '../../components/Tile';
import { BOTTOM_CHROME_SPACE } from '../../components/BottomNav';
import {
  useOrders,
  useTemplates,
  useFabrics,
  useGroupOrders,
  useInvoices,
} from '../../lib/queries';
import { spacing } from '../../lib/theme';
import { useGridColumns, useContentWidth } from '../../lib/use-breakpoint';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useTranslation } from '../../lib/i18n';

const GAP = spacing.md;

interface MoreTile {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: keyof SemanticColors;
  subtitle?: string;
  subtitleNumeric?: boolean;
  onPress: () => void;
}

export default function More() {
  const { t } = useTranslation();
  const scroll = useFloatingScroll();

  const { data: ordersData } = useOrders({});
  const { data: invoicesData } = useInvoices();
  const { data: templatesData } = useTemplates();
  const { data: fabricsData } = useFabrics();
  const { data: groupsData } = useGroupOrders();

  const orders = ordersData?.items ?? [];
  const invoicedOrderIds = new Set((invoicesData?.items ?? []).map((i) => i.orderId));
  const awaitingInvoice = orders.filter((o) => !invoicedOrderIds.has(o.id)).length;
  const count = (n: number, key: string) =>
    n > 0 ? { subtitle: t(key, { count: n }), subtitleNumeric: true } : {};

  const tiles: MoreTile[] = [
    {
      label: t('home.groups'),
      icon: 'diamond',
      tone: 'success',
      ...count(groupsData?.items.length ?? 0, 'home.eventsCount'),
      onPress: () => router.push('/(app)/groups'),
    },
    {
      label: t('home.templates'),
      icon: 'document-text',
      tone: 'primary',
      ...count(templatesData?.items.length ?? 0, 'home.patternsCount'),
      onPress: () => router.push('/(app)/templates'),
    },
    {
      label: t('fabrics.tileLabel'),
      icon: 'layers',
      tone: 'success',
      ...count(fabricsData?.items.length ?? 0, 'fabrics.tileCount'),
      onPress: () => router.push('/(app)/fabrics'),
    },
    {
      label: t('invoices.tileLabel'),
      icon: 'receipt',
      tone: 'warning',
      subtitle: t('invoices.tileAwaiting', { count: awaitingInvoice }),
      subtitleNumeric: true,
      onPress: () => router.push('/(app)/invoices'),
    },
    {
      label: t('requests.boardTitle'),
      icon: 'megaphone',
      tone: 'accent',
      subtitle: t('requests.tileSubtitle'),
      onPress: () => router.push('/(app)/requests'),
    },
    {
      label: t('home.designStudio'),
      icon: 'color-palette',
      tone: 'accent',
      subtitle: t('home.designStudioSubtitle'),
      onPress: () => router.push('/(app)/designs'),
    },
    {
      label: t('feed.worksTitle'),
      icon: 'shirt',
      tone: 'primary',
      subtitle: t('feed.worksTileSubtitle'),
      onPress: () => router.push('/(app)/works'),
    },
    {
      label: t('chat.tabLabel'),
      icon: 'chatbubbles',
      tone: 'primary',
      subtitle: t('chat.tabSubtitle'),
      onPress: () => router.push('/(app)/messages'),
    },
    {
      label: t('home.assistant'),
      icon: 'sparkles',
      tone: 'accent',
      subtitle: t('home.assistantSubtitle'),
      onPress: () => router.push('/(app)/assistant'),
    },
  ];

  const columns = useGridColumns();
  const contentWidth = useContentWidth('wide') - spacing.lg * 2;
  const tileWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  return (
    <Screen padded={false} width="wide">
      <ScreenHeader title={t('home.more')} />
      <ScrollView
        {...scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <View key={tile.label} style={{ width: tileWidth }}>
              <Tile {...tile} />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: BOTTOM_CHROME_SPACE + spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
