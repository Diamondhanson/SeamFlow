import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../lib/auth-context';
import { colors, spacing } from '../lib/theme';

const OTP_LEN = 6;
const RESEND_COOLDOWN_MS = 30 * 1000;

export default function VerifyOtp() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam ?? '').trim();

  const { verifyOtpSignup, resendSignupOtp } = useAuth();
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
      const msg = err instanceof Error ? err.message : 'Could not verify';
      Alert.alert('Verification failed', msg);
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
      Alert.alert('Code sent', 'Check your email for a new 6-digit code.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend';
      Alert.alert('Resend failed', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>
      </View>

      <Input
        label="Verification code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, OTP_LEN))}
        keyboardType="number-pad"
        maxLength={OTP_LEN}
        placeholder="123456"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />

      <Button
        label="Verify"
        onPress={verify}
        loading={verifying}
        disabled={code.length !== OTP_LEN || verifying}
      />

      <View style={styles.resendRow}>
        <Pressable onPress={resend} disabled={cooldownLeftMs > 0 || resending}>
          <Text
            style={[
              styles.resendText,
              (cooldownLeftMs > 0 || resending) && styles.resendDisabled,
            ]}
          >
            {cooldownLeftMs > 0
              ? `Resend in ${Math.ceil(cooldownLeftMs / 1000)}s`
              : resending
                ? 'Sending…'
                : "Didn't get the code? Resend"}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.xl }} />
      <Pressable onPress={() => router.replace('/sign-in')}>
        <Text style={styles.back}>← Use a different email</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  brand: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  email: { color: colors.text, fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: spacing.lg },
  resendText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  resendDisabled: { color: colors.textMuted },
  back: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
});
