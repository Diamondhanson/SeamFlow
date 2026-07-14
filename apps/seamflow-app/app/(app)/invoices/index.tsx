import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, ListRow, useAtelierTheme } from '@seamflow/ui';
import { formatCurrency } from '@seamflow/utils';
import { Screen } from '../../../components/Screen';
import { SkeletonList } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { HelpCard } from '../../../components/HelpCard';
import { useInvoices, useOrders } from '../../../lib/queries';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';

const money = (amt: number, cur: string | null) =>
  cur ? formatCurrency(amt, cur) : String(amt);

export default function InvoicingHome() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();
  const ordersQ = useOrders();
  const invoicesQ = useInvoices();

  const invoices = invoicesQ.data?.items ?? [];
  const orders = ordersQ.data?.items ?? [];

  const { recent, others } = useMemo(() => {
    const invoiced = new Set((invoicesQ.data?.items ?? []).map((i) => i.orderId));
    const awaiting = (ordersQ.data?.items ?? [])
      .filter((o) => !invoiced.has(o.id))
      .sort(
        (a, b) =>
          new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime(),
      );
    return { recent: awaiting.slice(0, 5), others: awaiting.slice(5) };
  }, [ordersQ.data, invoicesQ.data]);

  // Route straight into the editor, passing the order so it creates-or-opens
  // the invoice there. Navigation is never blocked on the create round-trip.
  const openForOrder = (orderId: string) =>
    router.push({ pathname: '/(app)/invoices/[id]', params: { id: 'new', orderId } });

  const orderRow = (o: (typeof orders)[number]) => (
    <View key={o.id} style={styles.row}>
      <ListRow
        title={o.orderName}
        subtitle={new Date(o.dateOrdered).toLocaleDateString()}
        subtitleNumeric
        leading={<Ionicons name="receipt-outline" size={20} color={colors.primary} />}
        onPress={() => openForOrder(o.id)}
      />
    </View>
  );

  const loading = ordersQ.isLoading || invoicesQ.isLoading;

  return (
    <Screen padded={false} width="wide">
      <View style={styles.padded}>
        <ScreenHeader title={t('invoices.listTitle')} subtitle={t('invoices.listSubtitle')} />
        <HelpCard
          guideKey="flow.invoices"
          title={t('guides.invoicesTitle')}
          message={t('guides.invoicesBody')}
        />
      </View>
      <ScrollView
        {...scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {loading ? (
          <SkeletonList leading="square" />
        ) : (
          <>
            {/* Recent orders awaiting an invoice */}
            {recent.length > 0 ? (
              <>
                <Text variant="h3" style={styles.section}>
                  {t('invoices.recentAwaiting')}
                </Text>
                {recent.map(orderRow)}
              </>
            ) : null}

            {/* Other orders awaiting an invoice */}
            {others.length > 0 ? (
              <>
                <Text variant="h3" style={styles.section}>
                  {t('invoices.otherAwaiting')}
                </Text>
                {others.map(orderRow)}
              </>
            ) : null}

            {recent.length === 0 && others.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                {t('invoices.noAwaiting')}
              </Text>
            ) : null}

            {/* All generated invoices */}
            <Text variant="h3" style={styles.section}>
              {t('invoices.allInvoices')}
            </Text>
            {invoices.length === 0 ? (
              <Text variant="bodySm" tone="textMuted" style={styles.muted}>
                {t('invoices.noInvoices')}
              </Text>
            ) : (
              invoices.map((inv) => (
                <View key={inv.id} style={styles.row}>
                  <ListRow
                    title={inv.number}
                    subtitle={`${inv.clientName ?? '—'} · ${money(inv.total, inv.currency)} · ${t(
                      `invoices.status_${inv.status}`,
                    )}`}
                    leading={<Ionicons name="document-text-outline" size={20} color={colors.primary} />}
                    onPress={() => router.push(`/(app)/invoices/${inv.id}`)}
                  />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { marginBottom: spacing.sm },
  muted: { marginTop: spacing.md },
});
