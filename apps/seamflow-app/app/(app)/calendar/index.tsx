import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Order, OrderStatus } from '@seamflow/schemas';
import { Text, Chip, useAtelierTheme, type ChipTone } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { useOrders } from '../../../lib/queries';
import { radii, spacing } from '../../../lib/theme';

// ============================================================================
// Delivery calendar — a month grid that highlights days with a delivery due,
// and lists the orders for the tapped day below the grid.
//
// We fetch one month at a time (dueAfter/dueBefore span the visible month) and
// re-bucket client-side by local calendar day, so the dots line up with what
// the user reads on screen regardless of the UTC offset baked into the ISO
// timestamps.
// ============================================================================

const STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Fitting',
  on_pause: 'On pause',
  delivered: 'Delivered',
};

const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarScreen() {
  const theme = useAtelierTheme();

  const today = useMemo(() => startOfDay(new Date()), []);
  // Cursor is always the first of the month currently in view.
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Span the whole visible month. Boundaries are deliberately wide (local
  // midnight → UTC can drift a few hours); we re-filter by local Y/M below.
  const range = useMemo(() => {
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
      dueAfter: monthStart.toISOString(),
      dueBefore: monthEnd.toISOString(),
    };
  }, [year, month]);

  const { data, isLoading } = useOrders(range);

  // Bucket orders by day-of-month for the month in view.
  const ordersByDay = useMemo(() => {
    const map = new Map<number, Order[]>();
    for (const order of data?.items ?? []) {
      if (!order.dateDelivery) continue;
      const dt = new Date(order.dateDelivery);
      if (dt.getFullYear() !== year || dt.getMonth() !== month) continue;
      const day = dt.getDate();
      const bucket = map.get(day);
      if (bucket) bucket.push(order);
      else map.set(day, [order]);
    }
    return map;
  }, [data, year, month]);

  // Leading blanks (so day 1 lands under its weekday) + the actual days.
  const cells = useMemo<(number | null)[]>(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [year, month]);

  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  function changeMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
    setSelectedDay(null);
  }

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const selectedOrders =
    selectedDay != null ? ordersByDay.get(selectedDay) ?? [] : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        {/* Month switcher */}
        <View style={styles.monthRow}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            hitSlop={12}
            style={[styles.navBtn, { backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text variant="h3" tone="text">
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            hitSlop={12}
            style={[styles.navBtn, { backgroundColor: theme.colors.surface }]}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Weekday header */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <View key={i} style={styles.weekCell}>
              <Text variant="caption" tone="textMuted">
                {w}
              </Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (day == null) {
              return <View key={`blank-${idx}`} style={styles.cell} />;
            }
            const hasDeliveries = ordersByDay.has(day);
            const isSelected = day === selectedDay;
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <TouchableOpacity
                key={day}
                style={styles.cell}
                activeOpacity={0.7}
                onPress={() => setSelectedDay(day)}
              >
                <View
                  style={[
                    styles.dayInner,
                    hasDeliveries &&
                      !isSelected && {
                        backgroundColor: theme.colors.surfaceElevated,
                      },
                    isToday &&
                      !isSelected && {
                        borderWidth: 1,
                        borderColor: theme.colors.primary,
                      },
                    isSelected && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    variant="bodySm"
                    tone={isSelected ? 'textOnPrimary' : 'text'}
                  >
                    {day}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    hasDeliveries && { backgroundColor: theme.colors.primary },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.hairline }]}
        />

        {/* Orders for the selected day */}
        {selectedDay == null ? (
          <Text variant="bodySm" tone="textMuted" style={styles.muted}>
            Pick a day to see its deliveries.
          </Text>
        ) : (
          <>
            <Text variant="h3" tone="text" style={styles.dayHeading}>
              {new Date(year, month, selectedDay).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {isLoading && selectedOrders.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                Loading…
              </Text>
            ) : selectedOrders.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                No deliveries due this day.
              </Text>
            ) : (
              selectedOrders.map((order) => (
                <Card
                  key={order.id}
                  onPress={() => router.push(`/(app)/orders/${order.id}`)}
                >
                  <View style={styles.rowBetween}>
                    <CardTitle>{order.orderName}</CardTitle>
                    <Chip
                      variant="status"
                      label={STATUS_LABEL[order.status]}
                      tone={STATUS_TONE[order.status]}
                    />
                  </View>
                  {order.dateDelivery ? (
                    <CardLine>
                      Delivery{' '}
                      {new Date(order.dateDelivery).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </CardLine>
                  ) : null}
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center', paddingBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
    backgroundColor: 'transparent',
  },
  divider: { height: 1, marginVertical: spacing.lg },
  dayHeading: { marginBottom: spacing.md },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: { textAlign: 'center', marginTop: spacing.lg },
});
