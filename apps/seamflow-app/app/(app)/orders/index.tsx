import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { OrderStatus } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { useOrders } from '../../../lib/queries';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { colors, radii, spacing } from '../../../lib/theme';

// ============================================================================
// Global orders list with filters — Phase 1.10.
//
// Three filter axes available:
//   - Status chips: one-tap toggle between any single status or "All"
//   - Time chips: "Due this week" / "Overdue" / "All time"
//   - Free-text search: matches order name (trigram on the server, debounced
//     here to 250 ms so we don't fire a request on every keystroke)
//
// Multi-select isn't supported on the status row yet — tapping a status
// replaces the active one (or clears it via "All"). Most tailors filter to
// one status at a time, so a chip group is the right widget.
// ============================================================================

const STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Fitting',
  on_pause: 'On pause',
  delivered: 'Delivered',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  registered: colors.textMuted,
  in_progress: colors.accent,
  testing: '#f5a524',
  on_pause: '#e35d6a',
  delivered: colors.success,
};

const STATUS_ORDER: OrderStatus[] = [
  'registered',
  'in_progress',
  'testing',
  'on_pause',
  'delivered',
];

type TimeFilter = 'all' | 'overdue' | 'thisWeek';

export default function OrdersList() {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 250);

  // Convert the friendly time chip into server-side dueBefore/dueAfter.
  // Server boundaries are inclusive on both ends.
  const { dueAfter, dueBefore } = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'overdue') {
      // Anything still not delivered with a delivery date <= now.
      return { dueAfter: undefined, dueBefore: now.toISOString() };
    }
    if (timeFilter === 'thisWeek') {
      // Today through Sunday-end. Caps look-ahead at 7 days.
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

  return (
    <Screen>
      <Text style={styles.title}>Orders</Text>

      <Input
        label="Search by order name"
        value={q}
        onChangeText={setQ}
        placeholder="Wedding suit, gown…"
        returnKeyType="search"
      />

      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip
          label="All statuses"
          active={status === null}
          onPress={() => setStatus(null)}
        />
        {STATUS_ORDER.map((s) => (
          <Chip
            key={s}
            label={STATUS_LABEL[s]}
            active={status === s}
            color={STATUS_COLOR[s]}
            onPress={() => setStatus(s)}
          />
        ))}
      </ScrollView>

      {/* Time chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip
          label="All time"
          active={timeFilter === 'all'}
          onPress={() => setTimeFilter('all')}
        />
        <Chip
          label="Overdue"
          active={timeFilter === 'overdue'}
          color="#e35d6a"
          onPress={() => setTimeFilter('overdue')}
        />
        <Chip
          label="Due this week"
          active={timeFilter === 'thisWeek'}
          color={colors.accent}
          onPress={() => setTimeFilter('thisWeek')}
        />
      </ScrollView>

      <View style={{ height: spacing.md }} />

      {isLoading && items.length === 0 ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>No orders match those filters.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(app)/orders/${item.id}`)}>
              <View style={styles.rowBetween}>
                <CardTitle>{item.orderName}</CardTitle>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: STATUS_COLOR[item.status] },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>
              {item.dateDelivery ? (
                <CardLine>
                  Delivery {new Date(item.dateDelivery).toLocaleDateString()}
                </CardLine>
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

// Small chip primitive — kept inline rather than as a shared component
// because no other screen has chip-style filters yet.
function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: color ?? colors.accent,
          borderColor: color ?? colors.accent,
        },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  chipRow: { paddingVertical: spacing.xs, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.accentText },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.lg,
  },
  statusText: { color: colors.accentText, fontSize: 10, fontWeight: '600' },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
