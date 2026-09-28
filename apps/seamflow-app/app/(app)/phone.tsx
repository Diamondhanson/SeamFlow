// ============================================================================
// Confirming your phone number.
//
// The first of appendix J's two requirements for a verified shop, and the only
// one that costs money per attempt — which shapes the whole screen:
//
//   · One send per press, never an automatic one. A screen that fires a code on
//     mount bills us every time someone opens it by accident.
//   · The countdown is real. The server decides how long a code lives and
//     returns `ttlMinutes`; this screen renders that number rather than one of
//     its own, because the vendor's window (five minutes) is shorter than the
//     one we used to assume (ten).
//   · Resend is deliberately dull until the code has had time to arrive.
//     WhatsApp on a slow Cameroonian connection is not instant, and an eager
//     resend button turns one 40 XAF message into three.
//
// Nothing here blocks anyone from anything — see appendix J's one rule. A
// tailor who never opens this screen keeps every feature they have.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, useKeyboardAppearance } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonForm } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { useDialog } from '../../lib/dialog';
import { haptics } from '../../lib/haptics';
import { useTranslation } from '../../lib/i18n';
import {
  useConfirmPhoneVerification,
  useMe,
  usePhoneStatus,
  useStartPhoneVerification,
} from '../../lib/queries';
import { radii, spacing } from '../../lib/theme';
import type { CountryCode } from 'libphonenumber-js';

/**
 * How long before the resend button wakes up.
 *
 * Shorter than the code's life on purpose: someone whose message genuinely did
 * not arrive should not have to wait out the full window, but nobody should be
 * able to send three in ten seconds either.
 */
const RESEND_AFTER_SECONDS = 45;

export default function PhoneVerification() {
  const { t, language } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const keyboardAppearance = useKeyboardAppearance();
  const { data: me } = useMe();
  const { data: status, isLoading } = usePhoneStatus();
  const start = useStartPhoneVerification();
  const confirm = useConfirmPhoneVerification();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  // The challenge in flight, or null while we are still on the number step.
  const [sent, setSent] = useState<{ phone: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cooldownUntil, setCooldownUntil] = useState(0);

  // One ticker for both the expiry and the resend cooldown. Only runs while a
  // code is outstanding, so the screen is idle on the number step.
  useEffect(() => {
    if (!sent) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sent]);

  const expired = sent ? sent.expiresAt <= now : false;
  const secondsLeft = sent ? Math.max(0, Math.ceil((sent.expiresAt - now) / 1000)) : 0;
  const resendIn = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const canResend = resendIn === 0;

  // Prefill from the account, so someone re-confirming an existing number does
  // not retype it. Runs once the /me response lands, and never overwrites what
  // the user has typed since.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !status) return;
    prefilled.current = true;
    if (status.phone) setPhone(status.phone);
  }, [status]);

  const defaultCountry = (me?.tailor?.countryCode?.toUpperCase() ?? undefined) as
    | CountryCode
    | undefined;

  const alreadyVerified = Boolean(status?.verified);
  const changingNumber = alreadyVerified && phone !== status?.phone;

  const send = async () => {
    if (!phone.trim()) return;
    try {
      const r = await start.mutateAsync({
        phone,
        defaultCountry,
        locale: language,
        channel: 'whatsapp',
      });
      haptics.sent();
      setSent({ phone: r.phone, expiresAt: new Date(r.expiresAt).getTime() });
      setCode('');
      setNow(Date.now());
      setCooldownUntil(Date.now() + RESEND_AFTER_SECONDS * 1000);
    } catch (err) {
      haptics.error();
      await dialog.error(err);
    }
  };

  const check = async () => {
    if (code.trim().length < 4) return;
    try {
      await confirm.mutateAsync(code.trim());
      haptics.success();
      setSent(null);
      setCode('');
      await dialog.alert({
        title: t('settings.phoneConfirmedTitle'),
        message: t('settings.phoneConfirmedBody'),
        tone: 'success',
      });
    } catch (err) {
      haptics.error();
      // Deliberately generic, because the server is deliberately generic: it
      // will not say whether a code was wrong, expired or never existed. The
      // resend button is what the honest user needs, and it is already there.
      setCode('');
      await dialog.error(err);
    }
  };

  const ttlLine = useMemo(() => {
    if (!sent) return '';
    if (expired) return t('settings.phoneCodeExpired');
    const mm = Math.floor(secondsLeft / 60);
    const ss = String(secondsLeft % 60).padStart(2, '0');
    return t('settings.phoneCodeExpiresIn', { time: `${mm}:${ss}` });
  }, [sent, expired, secondsLeft, t]);

  if (isLoading) {
    return (
      <Screen scroll>
        <ScreenHeader title={t('settings.phoneTitle')} />
        <SkeletonForm fields={2} />
      </Screen>
    );
  }

  // No provider configured on this server: there is nothing this screen can do,
  // and pretending otherwise would hand the user a button that only fails.
  if (status && !status.enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title={t('settings.phoneTitle')} />
        <View style={[styles.note, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text variant="body" tone="textMuted" style={styles.noteText}>
            {t('settings.phoneUnavailable')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('settings.phoneTitle')} />

      {alreadyVerified && !sent ? (
        <View
          style={[styles.note, { backgroundColor: colors.surface, borderRadius: radii.lg }]}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text variant="body" style={styles.noteText}>
            {t('settings.phoneAlreadyConfirmed', { phone: status?.phone ?? '' })}
          </Text>
        </View>
      ) : null}

      <Text variant="body" tone="textMuted" style={styles.lede}>
        {t('settings.phoneLede')}
      </Text>

      {!sent ? (
        <>
          <PhoneInput
            label={t('settings.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            defaultCountry={defaultCountry}
          />
          <Text variant="caption" tone="textMuted" style={styles.hint}>
            {t('settings.phoneChannelHint')}
          </Text>
          <Button
            label={
              changingNumber
                ? t('settings.phoneSendToNew')
                : alreadyVerified
                  ? t('settings.phoneResendAction')
                  : t('settings.phoneSendAction')
            }
            onPress={send}
            loading={start.isPending}
            disabled={!phone.trim() || start.isPending}
          />
        </>
      ) : (
        <>
          <Text variant="body" style={styles.sentTo}>
            {t('settings.phoneCodeSentTo', { phone: sent.phone })}
          </Text>

          <Input
            label={t('settings.phoneCodeLabel')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            keyboardAppearance={keyboardAppearance}
            // The OS offers to fill this from the message itself, which is the
            // single biggest thing that makes an OTP screen feel painless.
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            autoFocus
            helper={ttlLine}
          />

          <Button
            label={t('settings.phoneConfirmAction')}
            onPress={check}
            loading={confirm.isPending}
            disabled={code.trim().length < 4 || confirm.isPending || expired}
          />

          <Button
            label={canResend ? t('settings.phoneResendAction') : t('settings.phoneResendIn', { seconds: resendIn })}
            variant="secondary"
            onPress={send}
            loading={start.isPending}
            disabled={!canResend || start.isPending}
          />

          <Button
            label={t('settings.phoneChangeNumber')}
            variant="ghost"
            onPress={() => {
              setSent(null);
              setCode('');
            }}
          />
        </>
      )}

      <Text variant="caption" tone="textMuted" style={styles.footnote}>
        {t('settings.phonePrivacyNote')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { marginBottom: spacing.lg },
  hint: { marginTop: spacing.xs, marginBottom: spacing.lg },
  sentTo: { marginBottom: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: { flex: 1 },
  footnote: { marginTop: spacing.xl },
});
