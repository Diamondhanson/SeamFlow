// ============================================================================
// The tailor's public shop window (ROADMAP D.4.2).
//
// Everything here is world-readable, which is exactly why the trust signals
// are read-only: `isVerified` is granted by us, and `responseTimeHours` is
// computed from real reply latency. A badge you can award yourself tells a
// browsing client nothing, so neither is editable — they're shown with an
// explanation instead.
// ============================================================================

import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useMe, useUpdateTailorProfile } from '../../../lib/queries';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

/** Comma-separated text ⇄ string[] for the two list fields. */
const toList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);

export default function Storefront() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();

  const meQ = useMe();
  const save = useUpdateTailorProfile();
  const tailor = meQ.data?.tailor ?? null;

  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [languages, setLanguages] = useState('');
  const [acceptsRemote, setAcceptsRemote] = useState(false);

  // Re-seed whenever the profile arrives or changes underneath us.
  useEffect(() => {
    if (!tailor) return;
    setBio(tailor.bio ?? '');
    setCity(tailor.city ?? '');
    setSpecialties((tailor.specialties ?? []).join(', '));
    setLanguages((tailor.languages ?? []).join(', '));
    setAcceptsRemote(tailor.acceptsRemote ?? false);
  }, [tailor]);

  const submit = () => {
    save.mutate(
      {
        bio: bio.trim() || null,
        city: city.trim() || null,
        specialties: toList(specialties),
        languages: toList(languages),
        acceptsRemote,
      },
      {
        onSuccess: async () => {
          await dialog.alert({ title: t('feed.storefrontSaved'), tone: 'success' });
          router.back();
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  if (meQ.isLoading && !tailor) {
    return (
      <Screen>
        <ScreenHeader title={t('feed.storefrontTitle')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('feed.storefrontTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="bodySm" tone="textMuted" style={styles.intro}>
          {t('feed.storefrontSubtitle')}
        </Text>

        <Input
          label={t('feed.bioLabel')}
          placeholder={t('feed.bioPlaceholder')}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Input
          label={t('feed.cityLabel')}
          placeholder={t('feed.cityPlaceholder')}
          value={city}
          onChangeText={setCity}
        />
        <Input
          label={t('feed.specialtiesLabel')}
          placeholder={t('feed.specialtiesPlaceholder')}
          value={specialties}
          onChangeText={setSpecialties}
          autoCapitalize="none"
        />
        <Input
          label={t('feed.languagesLabel')}
          placeholder={t('feed.languagesPlaceholder')}
          value={languages}
          onChangeText={setLanguages}
        />

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: colors.card, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.toggleText}>
            <Text variant="body">{t('feed.acceptsRemoteLabel')}</Text>
            <Text variant="caption" tone="textMuted" style={styles.toggleHelp}>
              {t('feed.acceptsRemoteHelp')}
            </Text>
          </View>
          <Switch
            value={acceptsRemote}
            onValueChange={setAcceptsRemote}
            trackColor={{ true: atelier.primary, false: colors.border }}
          />
        </View>

        {/* Read-only trust signals. */}
        <View
          style={[
            styles.trust,
            { backgroundColor: colors.card, borderRadius: radii.lg },
          ]}
        >
          <Text variant="bodySm">
            {tailor?.isVerified ? `✓ ${t('feed.verifiedLabel')}` : t('feed.verifiedLabel')}
          </Text>
          <Text variant="caption" tone="textMuted" style={styles.toggleHelp}>
            {t('feed.verifiedHelp')}
          </Text>
          <Text variant="caption" tone="textMuted" style={styles.responseTime}>
            {tailor?.responseTimeHours != null
              ? t('feed.responseTimeLabel', { hours: tailor.responseTimeHours })
              : t('feed.responseTimeUnknown')}
          </Text>
        </View>

        <View style={styles.submit}>
          <Button
            label={t('feed.saveStorefront')}
            onPress={submit}
            disabled={save.isPending}
            loading={save.isPending}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  toggleText: { flex: 1 },
  toggleHelp: { marginTop: 2 },
  trust: { padding: spacing.md, marginTop: spacing.md },
  responseTime: { marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
});
