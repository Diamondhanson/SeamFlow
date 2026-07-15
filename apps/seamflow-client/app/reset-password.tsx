import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../lib/auth-context';
import { spacing } from '../lib/theme';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';

const OTP_LEN = 6;
const MIN_PASSWORD_LEN = 8;
const RESEND_COOLDOWN_MS = 30 * 1000;

// Two-stage password recovery:
//   request → type the email, we send a 6-digit code
//   reset   → type the code + a new password, we verify and update
// Mirrors verify-otp.tsx (same resend cooldown, same styling) but ends by
// setting a new password rather than confirming a signup.
export default function ResetPassword() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { sendPasswordResetOtp, confirmPasswordReset } = useAuth();
  const { t } = useTranslation();
  const dialog = useDialog();

  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState((emailParam ?? '').trim().toLowerCase());
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canReset = code.length === OTP_LEN && password.length >= MIN_PASSWORD_LEN;

  // Resend cooldown so the send button can't be hammered (server also limits).
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);
  const cooldownStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldownLeftMs <= 0) return;
    const id = setInterval(() => {
      const started = cooldownStartRef.current;
      if (!started) return;
      const left = Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - started));
      setCooldownLeftMs(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [cooldownLeftMs]);

  const sendCode = async () => {
    if (!isValidEmail || cooldownLeftMs > 0) return;
    const normalised = email.trim().toLowerCase();
    setSending(true);
    try {
      await sendPasswordResetOtp(normalised);
      setEmail(normalised);
      setStage('reset');
      cooldownStartRef.current = Date.now();
      setCooldownLeftMs(RESEND_COOLDOWN_MS);
      await dialog.alert({
        title: t('auth.codeSent'),
        message: t('auth.codeSentMessage'),
        tone: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.sendCodeFailed');
      await dialog.alert({ title: t('auth.sendCodeFailed'), message: msg, tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const submitReset = async () => {
    if (!canReset) return;
    setResetting(true);
    try {
      await confirmPasswordReset(email, code, password);
      await dialog.alert({
        title: t('auth.passwordResetDoneTitle'),
        message: t('auth.passwordResetDoneMessage'),
        tone: 'success',
      });
      // confirmPasswordReset left us with a session; land inside the app.
      router.replace('/(app)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.resetPasswordFailed');
      await dialog.alert({ title: t('auth.resetPasswordFailed'), message: msg, tone: 'error' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="h1">
          {stage === 'request'
            ? t('auth.resetPasswordTitle')
            : t('auth.resetEnterCodeTitle')}
        </Text>
        <Text variant="bodySm" tone="textMuted" style={styles.subtitle}>
          {stage === 'request' ? (
            t('auth.resetPasswordIntro')
          ) : (
            <>
              {t('auth.codeSentTo')}{'\n'}
              <Text variant="bodySm" tone="text" style={styles.email}>
                {email}
              </Text>
            </>
          )}
        </Text>
      </View>

      {stage === 'request' ? (
        <>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Button
            label={t('auth.sendResetCode')}
            onPress={sendCode}
            loading={sending}
            disabled={!isValidEmail || sending}
          />
        </>
      ) : (
        <>
          <Input
            label={t('auth.verificationCode')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, OTP_LEN))}
            keyboardType="number-pad"
            maxLength={OTP_LEN}
            placeholder="123456"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <PasswordInput
            label={t('auth.newPasswordWithMin', { min: MIN_PASSWORD_LEN })}
            value={password}
            onChangeText={setPassword}
          />
          <Button
            label={t('auth.resetPasswordCta')}
            onPress={submitReset}
            loading={resetting}
            disabled={!canReset || resetting}
          />

          <View style={styles.resendRow}>
            <Pressable onPress={sendCode} disabled={cooldownLeftMs > 0 || sending}>
              <Text
                variant="bodySm"
                tone={cooldownLeftMs > 0 || sending ? 'textMuted' : 'primary'}
                style={styles.resendText}
              >
                {cooldownLeftMs > 0
                  ? t('auth.resendIn', { seconds: Math.ceil(cooldownLeftMs / 1000) })
                  : sending
                    ? t('auth.sending')
                    : t('auth.resendPrompt')}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={{ height: spacing.xl }} />
      <Pressable onPress={() => router.replace('/sign-in')}>
        <Text variant="caption" tone="textMuted" style={styles.back}>
          {t('auth.useDifferentEmail')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  email: { fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: spacing.lg },
  resendText: { fontWeight: '600' },
  back: { textAlign: 'center' },
});
