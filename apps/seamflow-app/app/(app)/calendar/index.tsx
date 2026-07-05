import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@seamflow/schemas';
import { Text, IconButton, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { OrderCard } from '../../../components/OrderCard';
import { useOrders } from '../../../lib/queries';
import { useTranslation } from '../../../lib/i18n';
import { radii, spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';

// ============================================================================
// Delivery calendar — a month grid highlighting days with a delivery due, and
// the orders for the tapped day below. One month fetched at a time; re-bucketed
// client-side by local calendar day so dots line up with what's on screen.
// Week starts Monday, matching the redesign.
// ============================================================================

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();

  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const range = useMemo(() => {
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
      dueAfter: monthStart.toISOString(),
      dueBefore: monthEnd.toISOString(),
    };
  }, [year, month]);

  const { data, isLoading } = useOrders(range);

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

  const cells = useMemo<(number | null)[]>(() => {
    const firstWeekday = mondayIndex(new Date(year, month, 1).getDay());
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

  const selectedOrders =
    selectedDay != null ? ordersByDay.get(selectedDay) ?? [] : [];

  const dayHeading =
    selectedDay != null
      ? (isCurrentMonth && selectedDay === today.getDate() ? t('misc.today') : '') +
        new Date(year, month, selectedDay)
          .toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })
          .toUpperCase()
      : null;

  return (
    <Screen padded={false}>
      <ScrollView
        {...scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={cursor.toLocaleDateString(undefined, { month: 'long' })}
          subtitle={String(year)}
          subtitleNumeric
          right={
            <>
              <IconButton onPress={() => changeMonth(-1)} accessibilityLabel={t('misc.previousMonth')}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </IconButton>
              <IconButton onPress={() => changeMonth(1)} accessibilityLabel={t('misc.nextMonth')}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </IconButton>
            </>
          }
        />

        {/* Framed month grid */}
        <View
          style={[
            styles.calCard,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        >
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={styles.weekCell}>
                <Text variant="label" tone="textMuted">
                  {w}
                </Text>
              </View>
            ))}
          </View>

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
                      isToday &&
                        !isSelected && {
                          borderWidth: 1,
                          borderColor: colors.primary,
                        },
                      isSelected && { backgroundColor: colors.primary },
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
                      hasDeliveries && { backgroundColor: colors.warning },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected-day heading + orders */}
        {selectedDay == null ? (
          <Text variant="bodySm" tone="textMuted" style={styles.muted}>
            {t('misc.pickADayToSee')}
          </Text>
        ) : (
          <>
            <View style={styles.dayHeadingRow}>
              <Text variant="label" tone="warning">
                {dayHeading}
              </Text>
              <Text variant="bodySm" tone="textMuted">
                {selectedOrders.length}{' '}
                {selectedOrders.length === 1 ? t('misc.event') : t('misc.events')}
              </Text>
            </View>
            {isLoading && selectedOrders.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                {t('common.loading')}
              </Text>
            ) : selectedOrders.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                {t('misc.noDeliveriesThisDay')}
              </Text>
            ) : (
              <View style={styles.dayList}>
                {selectedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/(app)/orders/${order.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 96,
  },
  calCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
  },
  weekRow: { flexDirection: 'row' },
  weekCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
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
  dayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  dayList: { gap: spacing.md },
  muted: { textAlign: 'center', marginTop: spacing.lg },
});
