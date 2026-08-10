// ============================================================================
// "Shared to SeamFlow" — where an image from the OS share sheet lands.
//
// The plumbing that gets us here is platform-specific (native intent on
// Android, service-worker POST on the PWA); see lib/share-inbox.ts. By the time
// this screen renders, both look the same: a list of images and a question.
//
// The question is the whole feature. Nothing else in the app knows where a
// photo arriving from Instagram or WhatsApp is supposed to go, so this screen
// asks once and remembers the answer for next time.
//
// Orders are deliberately absent from the destinations. Picking WHICH order
// needs a searchable list, and a share sheet is the wrong moment to make
// someone hunt — the tailor can attach from the order screen, where they
// already have the order open.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';
import { useMe } from '../../lib/queries';
import { uploadDesign, uploadWork } from '../../lib/photo-upload';
import {
  lastDestination,
  rememberDestination,
  takeSharedImages,
  type SharedImage,
  type ShareDestination,
} from '../../lib/share-inbox';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { useDialog } from '../../lib/dialog';
import { qk } from '../../lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';

const DESTINATIONS: {
  key: Exclude<ShareDestination, 'order' | 'fabric'>;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  bodyKey: string;
}[] = [
  {
    key: 'design',
    icon: 'color-palette-outline',
    labelKey: 'share.toDesignStudio',
    bodyKey: 'share.toDesignStudioBody',
  },
  {
    key: 'work',
    icon: 'shirt-outline',
    labelKey: 'share.toMyDesigns',
    bodyKey: 'share.toMyDesignsBody',
  },
];

export default function ShareReceive() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const dialog = useDialog();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id ?? null;

  const [images, setImages] = useState<SharedImage[] | null>(null);
  const [choice, setChoice] = useState<ShareDestination>('design');
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);

  // Claim the payload once. Both transports hand it over destructively, so a
  // second visit to this screen must not re-upload the same photos.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [taken, last] = await Promise.all([takeSharedImages(), lastDestination()]);
        if (cancelled) return;
        setImages(taken);
        if (last && last !== 'order' && last !== 'fabric') setChoice(last);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const save = async () => {
    if (!tailorId || !images?.length) return;
    setSaving({ done: 0, total: images.length });
    let failed = 0;
    // One at a time, matching the Design Studio batch upload: each image is
    // decoded and re-encoded, and doing several at once spikes memory enough
    // to stall a mid-range phone.
    for (let i = 0; i < images.length; i++) {
      setSaving({ done: i + 1, total: images.length });
      try {
        if (choice === 'work') await uploadWork({ tailorId, asset: images[i]! });
        else await uploadDesign({ tailorId, asset: images[i]! });
      } catch {
        failed++;
      }
    }
    setSaving(null);
    await rememberDestination(choice);
    qc.invalidateQueries({ queryKey: qk.designs() });
    qc.invalidateQueries({ queryKey: qk.works() });

    if (failed === images.length) {
      await dialog.error({
        title: t('share.savedNoneTitle'),
        message: t('share.savedNoneBody'),
      });
      return;
    }
    if (failed > 0) {
      await dialog.alert({
        title: t('share.savedSomeTitle'),
        message: t('share.savedSomeBody', { n: images.length - failed, total: images.length }),
        tone: 'warning',
      });
    }
    router.replace(choice === 'work' ? '/(app)/works' : '/(app)/designs');
  };

  const empty = images !== null && images.length === 0;

  return (
    <Screen>
      <ScreenHeader title={t('share.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        {empty ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
            <Text variant="h3" style={{ marginTop: spacing.md }}>
              {t('share.nothingTitle')}
            </Text>
            <Text variant="bodySm" tone="textMuted" style={styles.emptyBody}>
              {t('share.nothingBody')}
            </Text>
            <View style={styles.emptyCta}>
              <Button label={t('common.done')} onPress={() => router.replace('/(app)')} />
            </View>
          </View>
        ) : (
          <>
            <Text variant="bodySm" tone="textMuted" style={styles.intro}>
              {images
                ? t('share.intro', { count: images.length })
                : t('common.loading')}
            </Text>

            {/* Show what arrived, so it's obvious the right photos came across. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
              {(images ?? []).map((img, i) => (
                <Image
                  key={`${img.uri}-${i}`}
                  source={{ uri: img.uri }}
                  style={[styles.thumb, { borderColor: colors.hairline }]}
                />
              ))}
            </ScrollView>

            <Text variant="label" tone="textMuted" style={styles.sectionLabel}>
              {t('share.saveTo')}
            </Text>

            {DESTINATIONS.map((d) => {
              const active = choice === d.key;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setChoice(d.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.option,
                    {
                      backgroundColor: colors.card,
                      borderColor: active ? atelier.primary : colors.hairline,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: active ? atelier.primary : colors.cardElevated },
                    ]}
                  >
                    <Ionicons
                      name={d.icon}
                      size={18}
                      color={active ? atelier.textOnPrimary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="body">{t(d.labelKey)}</Text>
                    <Text variant="caption" tone="textMuted">
                      {t(d.bodyKey)}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? atelier.primary : colors.textMuted}
                  />
                </Pressable>
              );
            })}

            <View style={styles.actions}>
              <Button
                label={
                  saving
                    ? t('share.savingProgress', { done: saving.done, total: saving.total })
                    : t('share.saveCta')
                }
                onPress={save}
                loading={!!saving}
                disabled={!images?.length || !tailorId || !!saving}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => router.replace('/(app)')}
                disabled={!!saving}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  intro: { marginBottom: spacing.md },
  strip: { marginBottom: spacing.lg },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  sectionLabel: { marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  actions: { marginTop: spacing.lg },
  emptyWrap: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyBody: { textAlign: 'center', marginTop: spacing.xs },
  emptyCta: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
