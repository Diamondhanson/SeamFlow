// ============================================================================
// Getting verified.
//
// Two steps, both skippable, the whole thing abandonable — because appendix J's
// first rule is that none of this blocks anybody. A tailor who closes this
// screen and never comes back keeps every feature they have, Discover included.
// Nothing on this screen may ever read as a requirement.
//
// THE CAMERA IS THE WHOLE POINT
//
// Step two opens the CAMERA, with no "choose from gallery" anywhere. That is
// not a limitation to apologise for, it is the check itself: the dominant fraud
// in fashion discovery is stolen photos, and someone who took their portfolio
// from Pinterest cannot produce a live shot of the garment on their machine.
// A gallery fallback would quietly delete the only thing being verified, so the
// copy explains why instead — a camera-only picker with no explanation reads as
// a bug, and people work around bugs.
//
// AFTERWARDS THIS IS A STATUS SCREEN
//
// Submitted → waiting → approved, or declined with the staff's reason shown
// word for word and the step re-openable. A decline that cannot be acted on is
// just a door closing.
// ============================================================================

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonForm } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { useDialog } from '../../lib/dialog';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';
import { pickPhotos, uploadVerificationEvidence } from '../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../lib/permissions';
import {
  useMe,
  useSubmitVerification,
  useVerification,
  useWithdrawVerification,
} from '../../lib/queries';
import { radii, spacing } from '../../lib/theme';

interface Shot {
  uri: string;
  storagePath: string;
  capturedAt: string;
}

export default function Verification() {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { data: me } = useMe();
  const { data: state, isLoading } = useVerification();
  const submit = useSubmitVerification();
  const withdraw = useWithdrawVerification();

  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);

  const userId = me?.id;
  const request = state?.request ?? null;
  const pending = request?.status === 'pending';
  const declined = request?.status === 'rejected';
  const verified = Boolean(state?.isVerified);

  const takePhoto = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      // Camera only. There is deliberately no library branch to fall back to.
      const picked = await pickPhotos('camera', 1);
      const asset = picked[0];
      if (!asset) return;
      const up = await uploadVerificationEvidence({ userId, asset });
      haptics.sent();
      setShots((s) => [...s, { ...up, uri: asset.uri, capturedAt: new Date().toISOString() }]);
    } catch (err) {
      if (await alertIfOffline(err, dialog, t)) return;
      if (await alertIfPermissionDenied(err, dialog, t)) return;
      await dialog.error(err);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    try {
      await submit.mutateAsync(
        shots.map((s) => ({
          kind: 'work_photo' as const,
          storagePath: s.storagePath,
          capturedAt: s.capturedAt,
        })),
      );
      haptics.success();
      setShots([]);
      await dialog.alert({
        title: t('verification.sentTitle'),
        message: t('verification.sentBody'),
        tone: 'success',
      });
    } catch (err) {
      haptics.error();
      await dialog.error(err);
    }
  };

  const takeBack = async () => {
    const ok = await dialog.confirm({
      title: t('verification.withdrawTitle'),
      message: t('verification.withdrawBody'),
    });
    if (!ok) return;
    try {
      await withdraw.mutateAsync();
      haptics.success();
    } catch (err) {
      await dialog.error(err);
    }
  };

  if (isLoading) {
    return (
      <Screen scroll>
        <ScreenHeader title={t('verification.title')} />
        <SkeletonForm fields={3} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('verification.title')} />

      {verified ? (
        <Note tone="good" icon="shield-checkmark">
          {t('verification.alreadyVerified')}
        </Note>
      ) : null}

      {pending ? (
        <>
          <Note tone="info" icon="time-outline">
            {t('verification.pendingBody')}
          </Note>
          <Button
            label={t('verification.withdrawAction')}
            variant="ghost"
            onPress={takeBack}
            loading={withdraw.isPending}
          />
        </>
      ) : null}

      {declined && request?.decisionNote ? (
        <Note tone="bad" icon="alert-circle-outline">
          {t('verification.declinedBody', { reason: request.decisionNote })}
        </Note>
      ) : null}

      {/* The ask, and the two steps. Hidden while something is already with us:
          asking again does not make us faster. */}
      {!pending ? (
        <>
          <Text variant="body" tone="textMuted" style={styles.lede}>
            {verified ? t('verification.ledeVerified') : t('verification.lede')}
          </Text>

          <Step
            n={1}
            done={Boolean(state?.phoneVerified)}
            title={t('verification.step1Title')}
            body={t('verification.step1Body')}
            actionLabel={t('verification.step1Action')}
            onPress={() => router.push('/(app)/phone')}
          />

          <Step
            n={2}
            done={shots.length > 0}
            title={t('verification.step2Title')}
            body={t('verification.step2Body')}
            actionLabel={
              shots.length > 0 ? t('verification.step2Another') : t('verification.step2Action')
            }
            onPress={takePhoto}
            busy={busy}
            // Only meaningful once the phone is done, but NOT disabled: someone
            // who wants to take the photo first and confirm their number after
            // is doing nothing wrong.
          />

          {shots.length > 0 ? (
            <View style={styles.shots}>
              {shots.map((s) => (
                <Image key={s.storagePath} source={{ uri: s.uri }} style={styles.shot} />
              ))}
            </View>
          ) : null}

          <Button
            label={t('verification.submitAction')}
            onPress={send}
            loading={submit.isPending}
            disabled={!state?.phoneVerified || shots.length === 0 || submit.isPending}
          />
          {!state?.phoneVerified ? (
            <Text variant="caption" tone="textMuted" style={styles.hint}>
              {t('verification.needPhoneFirst')}
            </Text>
          ) : null}

          <Text variant="caption" tone="textMuted" style={styles.footnote}>
            {t('verification.privacyNote')}
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function Step({
  n,
  done,
  title,
  body,
  actionLabel,
  onPress,
  busy,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const { colors } = useAtelierTheme();
  return (
    <View style={[styles.step, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
      <View style={styles.stepHead}>
        <View
          style={[
            styles.bullet,
            { backgroundColor: done ? colors.success : colors.primarySoft },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
          ) : (
            <Text variant="caption" tone="text">
              {String(n)}
            </Text>
          )}
        </View>
        <Text variant="body" style={styles.stepTitle}>
          {title}
        </Text>
      </View>
      <Text variant="bodySm" tone="textMuted" style={styles.stepBody}>
        {body}
      </Text>
      <Button label={actionLabel} variant="secondary" onPress={onPress} loading={busy} />
    </View>
  );
}

function Note({
  tone,
  icon,
  children,
}: {
  tone: 'good' | 'bad' | 'info';
  icon: keyof typeof Ionicons.glyphMap;
  children: string;
}) {
  const { colors } = useAtelierTheme();
  const color =
    tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.textMuted;
  return (
    <View style={[styles.note, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text variant="body" style={styles.noteText}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lede: { marginBottom: spacing.lg },
  hint: { marginTop: spacing.sm },
  footnote: { marginTop: spacing.xl },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: { flex: 1 },
  step: { padding: spacing.md, marginBottom: spacing.md },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { flex: 1 },
  stepBody: { marginTop: spacing.xs, marginBottom: spacing.md },
  shots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  shot: { width: 88, height: 88, borderRadius: radii.md },
});
