// ============================================================================
// Requests — "Can you make this?" (the tailor's side, ROADMAP appendix H).
//
// Clients post a photo of a garment they want; this is the board of everything
// this tailor is allowed to answer. The set is decided server-side by
// eligibility — invited requests plus every open one in their area — and their
// specialities change the ORDER, never the set. A tailor must always be able
// to answer the job in front of them, even if they never ticked that chip.
//
// This is the direction of the marketplace that works before anyone has a
// portfolio: a new tailor with nothing published can still win work here.
// ============================================================================

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { garmentLabel, GARMENT_TYPES, type RequestSummary } from '@seamflow/schemas';
import { Chip, Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import { HelpCard } from '../../../components/HelpCard';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { useMe, useOpenRequests } from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function RequestsBoard() {
  const { t, language } = useTranslation();
  const colors = useThemeColors();
  const lang = language === 'fr' ? 'fr' : 'en';

  const { data: me } = useMe();
  const [garmentType, setGarmentType] = useState<string | undefined>(undefined);
  const q = useOpenRequests(garmentType ? { garmentType } : {});

  const items = q.data?.items ?? [];
  const specialties: string[] = me?.tailor?.specialties ?? [];

  // The filter chips are the tailor's OWN specialities, not the whole
  // taxonomy. Twenty-nine chips is a wall; the four things they actually make
  // is a filter. "All" is always first because the board's value is partly the
  // work they did not expect.
  const filterKeys = specialties.length
    ? specialties
    : GARMENT_TYPES.slice(0, 6).map((g) => g.key);

  return (
    <Screen>
      <ScreenHeader title={t('requests.boardTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 96 }}>
        <HelpCard
          guideKey="flow.requests"
          title={t('requests.guideTitle')}
          message={t('requests.guideBody')}
        />

        <View style={styles.filters}>
          <Chip
            label={t('requests.filterAll')}
            tone={garmentType ? 'primary' : 'success'}
            onPress={() => setGarmentType(undefined)}
          />
          {filterKeys.map((key) => (
            <Chip
              key={key}
              label={garmentLabel(key, lang)}
              tone={garmentType === key ? 'success' : 'primary'}
              onPress={() => setGarmentType(garmentType === key ? undefined : key)}
            />
          ))}
        </View>

        {specialties.length === 0 ? (
          <Pressable onPress={() => router.push('/(app)/specialties')}>
            <Card>
              <CardTitle>{t('requests.noSpecialtiesTitle')}</CardTitle>
              <CardLine>{t('requests.noSpecialtiesBody')}</CardLine>
            </Card>
          </Pressable>
        ) : null}

        {q.isLoading ? (
          <SkeletonList leading="square" chip />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={28} color={colors.textMuted} />
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {garmentType ? t('requests.emptyFiltered') : t('requests.empty')}
            </Text>
          </View>
        ) : (
          items.map((r) => <RequestCard key={r.id} request={r} lang={lang} />)
        )}
      </FormScroll>
    </Screen>
  );
}

function RequestCard({ request, lang }: { request: RequestSummary; lang: 'en' | 'fr' }) {
  const { t } = useTranslation();

  // How many people are already in front of you, and whether it is still worth
  // writing. A saturated request that still looked open would waste the exact
  // effort this board depends on.
  const closed = !request.acceptingOffers;
  const days = Math.max(
    0,
    Math.ceil((new Date(request.expiresAt).getTime() - Date.now()) / 86_400_000),
  );

  return (
    <Pressable onPress={() => router.push(`/(app)/requests/${request.id}`)}>
      <Card>
        <CardTitle>{request.title || garmentLabel(request.garmentType, lang)}</CardTitle>
        <CardLine>{garmentLabel(request.garmentType, lang)}</CardLine>
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
        <CardLine>
          {closed
            ? t('requests.enoughOffers')
            : t('requests.offersAndDays', { offers: request.offersCount, days })}
        </CardLine>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', maxWidth: 280 },
});
