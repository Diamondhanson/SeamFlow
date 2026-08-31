// ============================================================================
// One request, and the offers on it.
//
// The comparison screen is the point of the whole feature, and its layout is
// an argument: the tailor and their work come FIRST, the price comes last.
// Sorting by cheapest — or even leading with the number — turns this into an
// auction, and the tailors worth having leave an auction.
// ============================================================================

import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { garmentLabel } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonDetail } from '../../../components/Skeleton';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import {
  useAcceptOffer,
  useCloseRequest,
  useMyRequest,
  useRequestOffers,
} from '../../../lib/queries';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';

export default function RequestDetail() {
  const { t, language } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useMyRequest(id);
  const offersQ = useRequestOffers(id);
  const accept = useAcceptOffer(id);
  const close = useCloseRequest(id);

  const request = q.data ?? null;
  const offers = offersQ.data?.items ?? [];

  const onAccept = async (offerId: string) => {
    const ok = await dialog.confirm({
      title: t('requests.acceptTitle'),
      message: t('requests.acceptBody'),
      confirmLabel: t('requests.acceptConfirm'),
    });
    if (!ok) return;
    accept.mutate(offerId, {
      onSuccess: (res) => router.replace(`/(app)/messages/${res.conversationId}`),
      onError: (err) => void dialog.error(err),
    });
  };

  const onClose = async () => {
    const ok = await dialog.confirm({
      title: t('requests.closeTitle'),
      message: t('requests.closeBody'),
      confirmLabel: t('requests.closeConfirm'),
      destructive: true,
    });
    if (ok) close.mutate(undefined, { onError: (err) => void dialog.error(err) });
  };

  if (q.isLoading) {
    return (
      <Screen>
        <ScreenHeader title={t('requests.detailTitle')} />
        <SkeletonDetail />
      </Screen>
    );
  }
  if (!request) {
    return (
      <Screen>
        <ScreenHeader title={t('requests.detailTitle')} />
        <FormScroll>
          <Text variant="bodySm" tone="textMuted">{t('requests.gone')}</Text>
        </FormScroll>
      </Screen>
    );
  }

  const photo = request.photoUrls?.[0];
  const open = request.status === 'open';

  return (
    <Screen>
      <ScreenHeader title={request.title || garmentLabel(request.garmentType, language)} />
      <FormScroll contentContainerStyle={{ paddingBottom: 96 }}>
        {photo ? <Image source={{ uri: photo }} style={styles.hero} resizeMode="cover" /> : null}

        <Card>
          <CardTitle>{garmentLabel(request.garmentType, language)}</CardTitle>
          <CardLine>{request.description}</CardLine>
          <CardLine>{t('requests.statusLine', { status: request.status })}</CardLine>
        </Card>

        <Text variant="h3" style={{ marginTop: spacing.lg }}>
          {t('requests.offersHeading', { count: offers.length })}
        </Text>

        {offersQ.isLoading ? (
          <SkeletonDetail />
        ) : offers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={26} color={colors.textMuted} />
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {t('requests.noOffersYetClient')}
            </Text>
          </View>
        ) : (
          offers.map((o) => (
            <Card key={o.id}>
              {/* Message before money, deliberately — how they would make it
                  is the thing worth judging. */}
              <CardTitle>{o.message}</CardTitle>
              <CardLine>
                {o.price
                  ? o.priceMax
                    ? t('requests.offerRange', {
                        min: o.price,
                        max: o.priceMax,
                        currency: o.currency ?? '',
                      })
                    : t('requests.offerPrice', { price: o.price, currency: o.currency ?? '' })
                  : t('requests.offerToDiscuss')}
              </CardLine>

              {open && o.status !== 'declined' && o.status !== 'withdrawn' ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button
                    label={t('requests.chooseThisTailor')}
                    onPress={() => onAccept(o.id)}
                    loading={accept.isPending}
                  />
                </>
              ) : (
                <CardLine>{t('requests.offerStatus', { status: o.status })}</CardLine>
              )}
            </Card>
          ))
        )}

        {open ? (
          <>
            <View style={{ height: spacing.lg }} />
            <Button
              label={t('requests.closeRequest')}
              variant="ghost"
              size="sm"
              onPress={onClose}
            />
          </>
        ) : null}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg, marginBottom: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', maxWidth: 280 },
});
