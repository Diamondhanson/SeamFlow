import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '@seamflow/schemas';
import { Text, IconButton, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SearchField } from '../../../components/SearchField';
import { OrderCard } from '../../../components/OrderCard';
import { OptionSheet, type SheetOption } from '../../../components/OptionSheet';
import { SkeletonList } from '../../../components/Skeleton';
import { useOrders } from '../../../lib/queries';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { STATUS_TONE, STATUS_ORDER } from '../../../lib/order-status';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useResponsiveValue, useContentWidth } from '../../../lib/use-breakpoint';

// ============================================================================
// Global orders list with filters — Phase 1.10, restyled to the redesign.
//
// Three filter axes: status chips, time chips (overdue / this week), and
// debounced free-text search. Multi-select isn't supported on the status row —
// tapping a status replaces the active one (or clears via "All").
// ============================================================================

type TimeFilter = 'all' | 'overdue' | 'thisWeek';

export default function OrdersList() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<'status' | 'time' | null>(null);
  const debouncedQ = useDebouncedValue(q, 250);
  const scroll = useFloatingScroll();

  // Filter menus — each trigger pill opens a single-select bottom sheet.
  const statusOptions: SheetOption[] = [
    { key: 'all', label: t('orders.filterAll') },
    ...STATUS_ORDER.map((s) => ({
      key: s,
      label: t(`orders.status_${s}`),
      tone: STATUS_TONE[s] as SheetOption['tone'],
    })),
  ];
  const timeOptions: SheetOption[] = [
    { key: 'all', label: t('orders.filterAllTime') },
    { key: 'overdue', label: t('orders.filterOverdue'), tone: 'danger' },
    { key: 'thisWeek', label: t('orders.filterDueThisWeek'), tone: 'primary' },
  ];
  const statusLabel = status ? t(`orders.status_${status}`) : t('orders.filterAll');
  const timeLabel =
    timeFilter === 'overdue'
      ? t('orders.filterOverdue')
      : timeFilter === 'thisWeek'
        ? t('orders.filterDueThisWeek')
        : t('orders.filterAllTime');

  // Friendly time chip → server-side dueBefore/dueAfter (inclusive both ends).
  const { dueAfter, dueBefore } = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'overdue') {
      return { dueAfter: undefined, dueBefore: now.toISOString() };
    }
    if (timeFilter === 'thisWeek') {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return { dueAfter: now.toISOString(), dueBefore: end.toISOString() };
    }
    return { dueAfter: undefined, dueBefore: undefined };
  }, [timeFilter]);

  const filter = useMemo(
    () => ({
      status: status ?? undefined,
      q: debouncedQ || undefined,
      dueAfter,
      dueBefore,
    }),
    [status, debouncedQ, dueAfter, dueBefore],
  );

  const { data, isLoading } = useOrders(filter);
  const items = data?.items ?? [];

  // Two-up card grid on wider screens; single column on phones. Cell width is
  // fixed (from the wide content cap) so a lone last card keeps its size.
  const columns = useResponsiveValue({ compact: 1, medium: 2, expanded: 2 });
  const contentW = useContentWidth('wide');
  const cellW =
    columns > 1
      ? Math.floor((contentW - spacing.lg * 2 - spacing.md * (columns - 1)) / columns)
      : undefined;

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader
          title={t('orders.listTitle')}
          right={
            <IconButton
              variant="primary"
              onPress={() => router.push('/(app)/new-order')}
              accessibilityLabel={t('orders.newOrder')}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </IconButton>
          }
        />
        <SearchField value={q} onChangeText={setQ} placeholder={t('orders.searchPlaceholder')} />

        {/* Two compact filter menus instead of two wrapping chip rows. */}
        <View style={styles.filterRow}>
          <FilterPill
            icon="funnel-outline"
            label={statusLabel}
            active={status !== null}
            onPress={() => setSheet('status')}
          />
          <FilterPill
            icon="time-outline"
            label={timeLabel}
            active={timeFilter !== 'all'}
            onPress={() => setSheet('time')}
          />
        </View>
      </View>

      <OptionSheet
        visible={sheet === 'status'}
        title={t('orders.statusSheetTitle')}
        options={statusOptions}
        selectedKey={status ?? 'all'}
        onSelect={(key) => setStatus(key === 'all' ? null : (key as OrderStatus))}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'time'}
        title={t('orders.dueSheetTitle')}
        options={timeOptions}
        selectedKey={timeFilter}
        onSelect={(key) => setTimeFilter(key as TimeFilter)}
        onClose={() => setSheet(null)}
      />

      {isLoading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <SkeletonList leading="circle" chip />
        </View>
      ) : items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          {t('orders.emptyNoMatch')}
        </Text>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(o) => o.id}
          key={`list-${columns}`}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.rowWrap : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={cellW ? { width: cellW } : undefined}>
              <OrderCard
                order={item}
                onPress={() => router.push(`/(app)/orders/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

// Trigger pill that opens a filter menu. Reads the current value + a chevron;
// tints itself when a non-default filter is active.
function FilterPill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, radii } = useAtelierTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.pill,
        {
          borderColor: active ? colors.primary : colors.hairline,
          backgroundColor: active ? withAlpha(colors.primary, 0.14) : colors.surface,
          borderRadius: radii.pill,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={active ? colors.primary : colors.textMuted}
      />
      <Text
        variant="bodySm"
        tone={active ? 'primary' : 'text'}
        numberOfLines={1}
        style={styles.pillLabel}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={active ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillLabel: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 96,
    rowGap: spacing.md,
  },
  rowWrap: { gap: spacing.md },
  muted: { textAlign: 'center', marginTop: spacing.xl },
  skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
