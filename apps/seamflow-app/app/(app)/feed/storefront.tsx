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
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text, Toggle, useAtelierTheme } from '@seamflow/ui';
import { catalogueUrl, isValidSlugShape, normalizePhone } from '@seamflow/utils';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useMe, useUpdateTailorProfile } from '../../../lib/queries';
import { useShareCatalogue } from '../../../lib/share-catalogue';
import { useDialog } from '../../../lib/dialog';
import { config } from '../../../lib/config';
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
  const [languages, setLanguages] = useState('');
  const [acceptsRemote, setAcceptsRemote] = useState(false);
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const shareCatalogue = useShareCatalogue();

  // Re-seed whenever the profile arrives or changes underneath us.
  useEffect(() => {
    if (!tailor) return;
    setBio(tailor.bio ?? '');
    setCity(tailor.city ?? '');
    setLanguages((tailor.languages ?? []).join(', '));
    setAcceptsRemote(tailor.acceptsRemote ?? false);
    setSlug(tailor.slug ?? '');
    setWhatsapp(tailor.publicWhatsapp ?? '');
  }, [tailor]);

  const submit = async () => {
    const nextSlug = slug.trim().toLowerCase();
    const nextWhatsapp = whatsapp.trim();

    // Validate before sending, so a typo comes back as this field's own error
    // rather than a generic API failure with no indication of which box is wrong.
    if (nextSlug && !isValidSlugShape(nextSlug)) {
      await dialog.alert({ title: t('feed.catalogueAddressInvalid'), tone: 'error' });
      return;
    }

    // The API accepts strict E.164 only, so normalise here rather than letting
    // a locally-typed "670151973" reach a public page as a number wa.me cannot
    // dial. The tailor's own country is the sensible default for a bare number.
    let normalisedWhatsapp: string | null = null;
    if (nextWhatsapp) {
      normalisedWhatsapp = normalizePhone(nextWhatsapp, tailor?.countryCode ?? undefined);
      if (!normalisedWhatsapp) {
        await dialog.alert({ title: t('feed.publicWhatsappInvalid'), tone: 'error' });
        return;
      }
    }

    save.mutate(
      {
        bio: bio.trim() || null,
        city: city.trim() || null,
        languages: toList(languages),
        acceptsRemote,
        // Only send the slug when it actually changed. Sending the current
        // value back is harmless but makes every save a chance to collide with
        // nothing, and an unchanged address should never be able to 409.
        ...(nextSlug && nextSlug !== (tailor?.slug ?? '') ? { slug: nextSlug } : {}),
        publicWhatsapp: normalisedWhatsapp,
      },
      {
        onSuccess: async () => {
          await dialog.alert({ title: t('feed.storefrontSaved'), tone: 'success' });
          router.back();
        },
        onError: async (err) => {
          // 409 from the API means exactly one thing on this screen.
          const status = (err as { status?: number } | null)?.status;
          if (status === 409) {
            await dialog.alert({ title: t('feed.catalogueAddressTaken'), tone: 'error' });
            return;
          }
          await dialog.error(err);
        },
      },
    );
  };

  if (meQ.isLoading && !tailor) {
    return (
      <Screen>
        <ScreenHeader title={t('feed.storefrontTitle')} />
        <SkeletonForm fields={7} />
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
        {/* Specialties moved out of a comma-separated text box and into the
            shared garment taxonomy. Free text here is what produced "Caftan"
            vs "kaftan" vs "all garments. " across the app, and matching cannot
            read any of that. This screen no longer edits them — it shows what
            is set and hands off to the picker. */}
        <Text variant="caption" tone="textMuted" style={{ marginBottom: 4 }}>
          {t('specialties.storefrontLabel')}
        </Text>
        <Button
          label={
            (tailor?.specialties?.length ?? 0) > 0
              ? t('specialties.storefrontCount', { count: tailor?.specialties?.length ?? 0 })
              : t('specialties.storefrontEmpty')
          }
          variant="secondary"
          onPress={() => router.push('/(app)/specialties')}
        />
        <View style={{ height: spacing.md }} />
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
          <Toggle value={acceptsRemote} onValueChange={setAcceptsRemote} />
        </View>

        {/* ── Catalogue address ────────────────────────────────────────────
            Placed after the descriptive fields because the slug defaults from
            the business name: by the time a tailor reaches it, the shop it
            describes is already filled in above. */}
        <View style={{ marginTop: spacing.lg }}>
          <Input
            label={t('feed.catalogueAddressLabel')}
            value={slug}
            onChangeText={(v) => setSlug(v.toLowerCase().replace(/\s+/g, '-'))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('feed.catalogueAddressLabel')}
          />
          {/* Show the real, whole URL rather than just the slug — this is what
              will be on someone's phone, and seeing it assembled is the only
              way to judge whether it reads right. */}
          <Text variant="caption" tone="textMuted" style={styles.toggleHelp}>
            {slug ? catalogueUrl(config.webUrl, slug) : t('feed.catalogueAddressHelp')}
          </Text>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Input
            label={t('feed.publicWhatsappLabel')}
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder={t('feed.publicWhatsappPlaceholder')}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
          <Text variant="caption" tone="textMuted" style={styles.toggleHelp}>
            {t('feed.publicWhatsappHelp')}
          </Text>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Button
            label={t('feed.shareCatalogue')}
            variant="secondary"
            disabled={shareCatalogue.isPending}
            loading={shareCatalogue.isPending}
            onPress={() =>
              void shareCatalogue.share({
                tailorBusinessName: tailor?.businessName ?? 'SeamFlow',
              })
            }
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
