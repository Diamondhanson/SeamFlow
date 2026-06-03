import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { OrderStatus } from '@seamflow/schemas';
import { Text, Chip, type ChipTone } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { useOrders } from '../../../lib/queries';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { spacing } from '../../../lib/theme';

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

// Each status maps to its semantic color token (defined in @seamflow/ui).
// The Chip resolves the actual color from the theme, so this stays hex-free
// and re-skins automatically with the palette.
const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
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
      <Text variant="h1" style={styles.title}>
        Orders
      </Text>

      <Input
        label="Search by order name"
        value={q}
        onChangeText={setQ}
        placeholder="Wedding suit, gown…"
        returnKeyType="search"
      />

      {/* Status chips.
          A wrapping row (not a horizontal ScrollView): a horizontal scroll's
          content re-measures to an indefinite width on orientation change and
          collapses its chips to zero width. Wrapping fills the parent width and
          reflows, so it survives rotation and shows every filter at once on
          wide screens. */}
      <View style={styles.chipRow}>
        <Chip
          label="All statuses"
          selected={status === null}
          onPress={() => setStatus(null)}
        />
        {STATUS_ORDER.map((s) => (
          <Chip
            key={s}
            label={STATUS_LABEL[s]}
            selected={status === s}
            tone={STATUS_TONE[s]}
            onPress={() => setStatus(s)}
          />
        ))}
      </View>

      {/* Time chips */}
      <View style={styles.chipRow}>
        <Chip
          label="All time"
          selected={timeFilter === 'all'}
          onPress={() => setTimeFilter('all')}
        />
        <Chip
          label="Overdue"
          selected={timeFilter === 'overdue'}
          tone="danger"
          onPress={() => setTimeFilter('overdue')}
        />
        <Chip
          label="Due this week"
          selected={timeFilter === 'thisWeek'}
          tone="primary"
          onPress={() => setTimeFilter('thisWeek')}
        />
      </View>

      <View style={{ height: spacing.md }} />

      {isLoading && items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          Loading…
        </Text>
      ) : items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          No orders match those filters.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(app)/orders/${item.id}`)}>
              <View style={styles.rowBetween}>
                <CardTitle>{item.orderName}</CardTitle>
                <Chip
                  variant="status"
                  label={STATUS_LABEL[item.status]}
                  tone={STATUS_TONE[item.status]}
                />
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

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: { textAlign: 'center', marginTop: spacing.xl },
});
