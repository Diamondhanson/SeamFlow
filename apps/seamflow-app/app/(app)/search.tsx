// ============================================================================
// Global search — clients + orders in one place.
//
// Each list screen has its own search, but finding "that order for Amara" meant
// guessing which list to open first. This federates both: type once, see people
// and orders together, tap through to either. Reached from the home header.
// ============================================================================

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SearchField } from '../../components/SearchField';
import { OrderCard } from '../../components/OrderCard';
import { useClients, useOrders } from '../../lib/queries';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function Search() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 250);
  const active = debounced.trim().length > 0;

  const { data: clientsData } = useClients(active ? debounced : '');
  const { data: ordersData } = useOrders(active ? { q: debounced } : {});

  const clients = useMemo(
    () => (active ? (clientsData?.items ?? []).slice(0, 8) : []),
    [active, clientsData],
  );
  const orders = useMemo(
    () => (active ? (ordersData?.items ?? []).slice(0, 12) : []),
    [active, ordersData],
  );
  const empty = active && clients.length === 0 && orders.length === 0;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('home.searchA11y')} />
      <View style={styles.searchWrap}>
        <SearchField value={q} onChangeText={setQ} placeholder={t('home.searchPrompt')} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!active ? (
          <Text variant="bodySm" tone="textMuted" style={styles.hint}>
            {t('home.searchPrompt')}
          </Text>
        ) : null}

        {empty ? (
          <Text variant="bodySm" tone="textMuted" style={styles.hint}>
            {t('home.searchNoResults')}
          </Text>
        ) : null}

        {clients.length > 0 ? (
          <>
            <Text variant="label" tone="textMuted" style={styles.section}>
              {t('home.clients')}
            </Text>
            {clients.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={c.fullName}
                onPress={() => router.push(`/(app)/clients/${c.id}`)}
                style={({ pressed }) => [
                  styles.clientRow,
                  { backgroundColor: colors.surface, borderColor: colors.hairline },
                  pressed && styles.pressed,
                ]}
              >
                <Avatar name={c.fullName} size="sm" />
                <View style={styles.clientText}>
                  <Text variant="bodySm" numberOfLines={1} style={{ fontWeight: '600' }}>
                    {c.fullName}
                  </Text>
                  {c.phone ? (
                    <Text variant="caption" tone="textMuted" numberOfLines={1}>
                      {c.phone}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {orders.length > 0 ? (
          <>
            <Text variant="label" tone="textMuted" style={styles.section}>
              {t('home.orders')}
            </Text>
            <View style={styles.orderList}>
              {orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onPress={() => router.push(`/(app)/orders/${o.id}`)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  hint: { textAlign: 'center', marginTop: spacing.xl },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  clientText: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  orderList: { gap: spacing.md },
});
