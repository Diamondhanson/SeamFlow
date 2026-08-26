// ============================================================================
// "Describe this design" — shown the moment photos are picked, while they are
// still uploading behind it.
//
// The ordering is the whole point. Uploading first and asking afterwards makes
// the tailor watch a progress bar with nothing to do, and by the time the form
// appears they have put the phone down. Here the waiting happens underneath
// the form: they type the name and price while the bytes go up, and the two
// finish at roughly the same time.
//
// Everything on this screen is optional and "Skip" is always available. A
// design with no name is still a design; a form that blocks the tailor from
// leaving would just teach them to avoid the whole flow.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Work } from '@seamflow/schemas';
import { StartingPriceSchema } from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import { Text } from '@seamflow/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { WorkPhotoStrip } from '../../../components/WorkPhotoStrip';
import { useMe, useUpdateWork } from '../../../lib/queries';
import { clearPendingWork, getPendingWork } from '../../../lib/pending-work';
import { useDialog } from '../../../lib/dialog';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function DescribeWork() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const qc = useQueryClient();
  const { key } = useLocalSearchParams<{ key: string }>();

  const { data: me } = useMe();
  const updateM = useUpdateWork();

  const pending = getPendingWork(key ?? '');
  const [work, setWork] = useState<Work | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: pending?.total ?? 1 });
  const [failed, setFailed] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  // The form must stay usable after the upload resolves, so the result is
  // stored rather than awaited at save time — by then it is already here.
  const claimed = useRef(false);
  useEffect(() => {
    if (!pending || claimed.current) return;
    claimed.current = true;

    let alive = true;
    const tick = setInterval(() => {
      if (alive) setProgress({ done: pending.done, total: pending.total });
    }, 300);

    pending.promise
      .then((w) => {
        if (!alive) return;
        setWork(w);
        qc.invalidateQueries({ queryKey: ['works'] });
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => clearInterval(tick));

    return () => {
      alive = false;
      clearInterval(tick);
    };
  }, [pending, qc]);

  // Nothing to describe — a cold open of this route, or the entry was already
  // claimed and cleared. Send them back rather than showing an empty form.
  useEffect(() => {
    if (!pending) router.back();
  }, [pending]);

  const currency = me?.tailor?.currency ?? 'XAF';
  const uploading = !work && !failed;

  const finish = (meta: {
    title?: string | null;
    description?: string | null;
    startingPrice?: string | null;
    currency?: string | null;
  }) => {
    clearPendingWork(key ?? '');
    if (!work) {
      router.back();
      return;
    }
    updateM.mutate(
      { id: work.id, input: meta },
      {
        onSuccess: () => router.back(),
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const save = async () => {
    const trimmed = price.replace(/[\s,]/g, '');
    if (trimmed && !StartingPriceSchema.safeParse(trimmed).success) {
      await dialog.alert({ title: t('feed.priceInvalid'), tone: 'error' });
      return;
    }

    if (uploading) {
      // Save was tapped before the photos landed. Wait for them rather than
      // dropping what was typed — this is the one moment the tailor's work
      // could be silently lost.
      try {
        const w = await pending!.promise;
        setWork(w);
        updateM.mutate(
          {
            id: w.id,
            input: {
              title: title.trim() || null,
              description: description.trim() || null,
              startingPrice: trimmed || null,
              currency: trimmed ? currency : null,
            },
          },
          {
            onSuccess: () => {
              clearPendingWork(key ?? '');
              router.back();
            },
            onError: (err) => void dialog.error(err),
          },
        );
      } catch (err) {
        await dialog.error(err, { title: t('feed.describeUploadFailed') });
      }
      return;
    }

    finish({
      title: title.trim() || null,
      description: description.trim() || null,
      startingPrice: trimmed || null,
      currency: trimmed ? currency : null,
    });
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('feed.describeTitle')}
        onBack={() => {
          clearPendingWork(key ?? '');
          router.back();
        }}
      />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="bodySm" tone="textMuted" style={styles.intro}>
          {t('feed.describeSubtitle')}
        </Text>

        <WorkPhotoStrip images={work?.images} previewUris={pending?.previewUris} />

        {uploading ? (
          <Text variant="caption" style={{ color: colors.accent, marginTop: spacing.xs }}>
            {t('feed.describeUploading', {
              done: Math.max(progress.done, 1),
              total: progress.total,
            })}
          </Text>
        ) : null}
        {failed ? (
          <Text variant="caption" style={{ color: colors.danger, marginTop: spacing.xs }}>
            {t('feed.describeUploadFailed')}
          </Text>
        ) : null}

        <View style={{ height: spacing.lg }} />

        <Input
          label={t('feed.titleLabel')}
          placeholder={t('feed.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label={t('feed.descriptionLabel')}
          placeholder={t('feed.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Input
          label={t('feed.priceLabel')}
          placeholder={t('feed.pricePlaceholder')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <Text variant="caption" tone="textMuted">
          {t('feed.priceHelp', { example: formatCurrency(45000, currency) })}
        </Text>

        <View style={styles.actions}>
          <Button
            label={t('feed.saveAndFinish')}
            onPress={save}
            disabled={updateM.isPending || failed}
            loading={updateM.isPending}
          />
          <Button
            label={t('feed.skipForNow')}
            variant="secondary"
            onPress={() => {
              clearPendingWork(key ?? '');
              router.back();
            }}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
