// ============================================================================
// "My offers" — what this tailor has answered, and how it went.
//
// Exists mostly so a decline is visible. A tailor who writes a considered
// offer and never learns the outcome stops answering the board, and that is
// the failure mode that kills a marketplace like this quietly.
// ============================================================================

import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useMyOffers, useWithdrawOffer } from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';

export default function MyOffers() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const q = useMyOffers();
  const withdraw = useWithdrawOffer();

  const items = q.data?.items ?? [];

  const onWithdraw = async (id: string) => {
    const ok = await dialog.confirm({
      title: t('requests.withdrawTitle'),
      message: t('requests.withdrawBody'),
      confirmLabel: t('requests.withdraw'),
      destructive: true,
    });
    if (!ok) return;
    withdraw.mutate(id, { onError: (err) => void dialog.error(err) });
  };

  return (
    <Screen>
      <ScreenHeader title={t('requests.myOffersTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 96 }}>
        {q.isLoading ? (
          <SkeletonList chip />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="paper-plane-outline" size={28} color={colors.textMuted} />
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {t('requests.noOffersYet')}
            </Text>
            <Button
              label={t('requests.browseBoard')}
              variant="secondary"
              fullWidth={false}
              onPress={() => router.replace('/(app)/requests')}
            />
          </View>
        ) : (
          items.map((o) => (
            <Card key={o.id}>
              <CardTitle>{t('requests.offerStatus', { status: o.status })}</CardTitle>
              <CardLine>{o.message}</CardLine>
              {o.price ? (
                <CardLine>
                  {o.priceMax
                    ? t('requests.offerRange', {
                        min: o.price,
                        max: o.priceMax,
                        currency: o.currency ?? '',
                      })
                    : t('requests.offerPrice', { price: o.price, currency: o.currency ?? '' })}
                </CardLine>
              ) : (
                <CardLine>{t('requests.offerToDiscuss')}</CardLine>
              )}

              {o.status === 'accepted' && o.conversationId ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button
                    label={t('requests.openChat')}
                    onPress={() => router.push(`/(app)/messages/${o.conversationId}`)}
                  />
                </>
              ) : o.status === 'sent' || o.status === 'shortlisted' ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button
                    label={t('requests.withdraw')}
                    variant="ghost"
                    size="sm"
                    onPress={() => onWithdraw(o.id)}
                  />
                </>
              ) : null}
            </Card>
          ))
        )}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', maxWidth: 280 },
});
