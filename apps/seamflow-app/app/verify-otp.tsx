import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth-context';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

const OTP_LEN = 6;
const RESEND_COOLDOWN_MS = 30 * 1000;

export default function VerifyOtp() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam ?? '').trim();

  const { verifyOtpSignup, resendSignupOtp } = useAuth();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Cooldown so the resend button can't be hammered. Server-side limits
  // exist too, but a soft UI lock prevents the user from looking like a
  // spammer.
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);
  const cooldownStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldownLeftMs <= 0) return;
    const t = setInterval(() => {
      const started = cooldownStartRef.current;
      if (!started) return;
      const left = Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - started));
      setCooldownLeftMs(left);
      if (left <= 0) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [cooldownLeftMs]);

  // Defensive: if someone navigates here without an email param, send them
  // back to sign-in. The OTP API needs the email to be matched.
  useEffect(() => {
    if (!email) {
      router.replace('/sign-in');
    }
  }, [email]);

  const verify = async () => {
    if (code.length !== OTP_LEN) return;
    setVerifying(true);
    try {
      await verifyOtpSignup(email, code);
      // verifyOtp creates the session. The auth-context listener will pick
      // up the SIGNED_IN event and the router can land us inside (app).
      router.replace('/(app)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.verificationFailed');
      Alert.alert(t('auth.verificationFailed'), msg);
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldownLeftMs > 0) return;
    setResending(true);
    try {
      await resendSignupOtp(email);
      cooldownStartRef.current = Date.now();
      setCooldownLeftMs(RESEND_COOLDOWN_MS);
      Alert.alert(t('auth.codeSent'), t('auth.codeSentMessage'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.resendFailed');
      Alert.alert(t('auth.resendFailed'), msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="h1">{t('auth.checkYourEmail')}</Text>
        <Text variant="bodySm" tone="textMuted" style={styles.subtitle}>
          {t('auth.codeSentTo')}{'\n'}
          <Text variant="bodySm" tone="text" style={styles.email}>{email}</Text>
        </Text>
      </View>

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

      <Button
        label={t('auth.verify')}
        onPress={verify}
        loading={verifying}
        disabled={code.length !== OTP_LEN || verifying}
      />

      <View style={styles.resendRow}>
        <Pressable onPress={resend} disabled={cooldownLeftMs > 0 || resending}>
          <Text
            variant="bodySm"
            tone={cooldownLeftMs > 0 || resending ? 'textMuted' : 'primary'}
            style={styles.resendText}
          >
            {cooldownLeftMs > 0
              ? t('auth.resendIn', { seconds: Math.ceil(cooldownLeftMs / 1000) })
              : resending
                ? t('auth.sending')
                : t('auth.resendPrompt')}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.xl }} />
      <Pressable onPress={() => router.replace('/sign-in')}>
        <Text variant="caption" tone="textMuted" style={styles.back}>{t('auth.useDifferentEmail')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  email: { fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: spacing.lg },
  resendText: { fontWeight: '600' },
  back: { textAlign: 'center' },
});
