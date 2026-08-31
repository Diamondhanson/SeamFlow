// ============================================================================
// One request, and the tailor's answer to it.
//
// The offer form is deliberately small: a message, an optional price, and
// optionally one piece of past work. A price is OPTIONAL because forcing one
// turns this board into a lowest-bid auction, which is the fastest way to lose
// the tailors worth having. "Open to discuss" is a real answer.
// ============================================================================

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { garmentLabel } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonDetail } from '../../../components/Skeleton';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useMakeOffer, useMe, useMyOffers, useOpenRequest } from '../../../lib/queries';
import { parseDecimal } from '../../../lib/numeric';
import { radii, spacing, useThemeColors } from '../../../lib/theme';
import { useDialog } from '../../../lib/dialog';
import { useTranslation } from '../../../lib/i18n';
import { draftKey, useDraft } from '../../../lib/drafts';

export default function RequestDetail() {
  const { t, language } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useOpenRequest(id);
  const { data: me } = useMe();
  const offersQ = useMyOffers();
  const makeOffer = useMakeOffer(id);

  const [price, setPrice] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [message, setMessage] = useState('');

  // A tailor writing a considered offer on a phone is exactly the person who
  // gets interrupted. Same rescue as every other typing surface in the app.
  const { clear: clearDraft } = useDraft({
    key: draftKey('offer', id),
    value: { price, priceMax, message },
    hasContent: (d) => !!(d.price.trim() || d.priceMax.trim() || d.message.trim()),
    onRestore: (d) => {
      setPrice(d.price);
      setPriceMax(d.priceMax);
      setMessage(d.message);
    },
  });

  const request = q.data ?? null;
  const mine = (offersQ.data?.items ?? []).find((o) => o.requestId === id) ?? null;

  const send = () => {
    makeOffer.mutate(
      {
        price: parseDecimal(price) ?? null,
        priceMax: parseDecimal(priceMax) ?? null,
        currency: me?.tailor?.currency ?? null,
        message: message.trim(),
      },
      {
        onSuccess: async () => {
          clearDraft();
          await dialog.alert({
            title: t('requests.offerSentTitle'),
            message: t('requests.offerSentBody'),
            tone: 'success',
          });
          router.back();
        },
        onError: (err) => void dialog.error(err),
      },
    );
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
  const closed = !request.acceptingOffers;

  return (
    <Screen>
      <ScreenHeader title={request.title || garmentLabel(request.garmentType, language)} />
      <FormScroll contentContainerStyle={{ paddingBottom: 120 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.hero} resizeMode="cover" />
        ) : null}

        <Card>
          <CardTitle>{garmentLabel(request.garmentType, language)}</CardTitle>
          <CardLine>{request.description}</CardLine>
          {request.locationValue ? <CardLine>{request.locationValue}</CardLine> : null}
          <CardLine>
            {request.budgetMin || request.budgetMax
              ? t('requests.budgetLine', {
                  min: request.budgetMin ?? '—',
                  max: request.budgetMax ?? '—',
                  currency: request.currency ?? '',
                })
              : t('requests.budgetOpen')}
          </CardLine>
          {request.deadline ? (
            <CardLine>
              {t('requests.deadlineLine', {
                date: new Date(request.deadline).toLocaleDateString(),
              })}
            </CardLine>
          ) : null}
        </Card>

        {mine ? (
          // Already answered. Showing the form again would invite an offer the
          // server would reject — one per tailor per request is a hard rule.
          <Card>
            <CardTitle>{t('requests.alreadyOfferedTitle')}</CardTitle>
            <CardLine>{mine.message}</CardLine>
            <CardLine>{t('requests.offerStatus', { status: mine.status })}</CardLine>
          </Card>
        ) : closed ? (
          <Card>
            <CardTitle>{t('requests.enoughOffersTitle')}</CardTitle>
            <CardLine>{t('requests.enoughOffersBody')}</CardLine>
          </Card>
        ) : (
          <>
            <Text variant="h3" style={{ marginTop: spacing.lg }}>
              {t('requests.makeOfferHeading')}
            </Text>
            <Text variant="bodySm" tone="textMuted" style={{ marginBottom: spacing.sm }}>
              {t('requests.makeOfferHint')}
            </Text>

            <Input
              label={t('requests.messageLabel')}
              placeholder={t('requests.messagePlaceholder')}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <View style={styles.priceRow}>
              <View style={styles.priceCell}>
                <Input
                  label={t('requests.priceLabel')}
                  placeholder={t('requests.pricePlaceholder')}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.priceCell}>
                <Input
                  label={t('requests.priceMaxLabel')}
                  placeholder={t('requests.pricePlaceholder')}
                  value={priceMax}
                  onChangeText={setPriceMax}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text variant="caption" tone="textMuted" style={{ marginBottom: spacing.md }}>
              {t('requests.priceOptional')}
            </Text>

            <Button
              label={t('requests.sendOffer')}
              onPress={send}
              loading={makeOffer.isPending}
              disabled={message.trim().length < 10}
            />
          </>
        )}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  priceCell: { flex: 1 },
});
