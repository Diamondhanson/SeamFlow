import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import {
  EmailNotConfirmedError,
  GoogleCancelledError,
  useAuth,
} from '../lib/auth-context';
import { spacing } from '../lib/theme';

type Mode = 'signIn' | 'signUp';

const MIN_PASSWORD_LEN = 8;

// Sign-in is the first screen migrated to Atelier primitives. Notable:
//   - `<Text variant="display">` for the wordmark — Fraunces 700/34/40.
//   - `<Input>` (Atelier) for email + password — floating label, hairline,
//     focus ring; replaces the flat slab Input from components/.
//   - `<Button>` (Atelier) for the actions — pill radius, spring-on-press.
// Behavior (signInWithPassword / signUpWithPassword / signInWithGoogle /
// EmailNotConfirmedError routing) is unchanged.
export default function SignIn() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const theme = useAtelierTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValidPassword = password.length >= MIN_PASSWORD_LEN;
  const canSubmit = isValidEmail && isValidPassword;

  const onGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      router.replace('/(app)');
    } catch (err) {
      if (err instanceof GoogleCancelledError) return;
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      Alert.alert('Google sign-in failed', msg);
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    const normalisedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signInWithPassword(normalisedEmail, password);
        router.replace('/(app)');
      } else {
        await signUpWithPassword(normalisedEmail, password);
        router.replace(`/verify-otp?email=${encodeURIComponent(normalisedEmail)}`);
      }
    } catch (err: unknown) {
      if (err instanceof EmailNotConfirmedError) {
        router.replace(`/verify-otp?email=${encodeURIComponent(err.email)}`);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Auth failed';
      Alert.alert(mode === 'signIn' ? 'Sign in failed' : 'Sign up failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display" tone="text">
          SeamFlow
        </Text>
        <Text variant="bodySm" tone="textMuted" style={{ marginTop: 4 }}>
          Tailor CRM
        </Text>
      </View>

      <View
        style={[
          styles.tabs,
          { borderBottomColor: theme.colors.hairline },
        ]}
      >
        <Pressable
          style={[
            styles.tab,
            mode === 'signIn' && { borderBottomColor: theme.colors.primary },
          ]}
          onPress={() => setMode('signIn')}
        >
          <Text
            variant="label"
            tone={mode === 'signIn' ? 'text' : 'textMuted'}
          >
            Sign in
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            mode === 'signUp' && { borderBottomColor: theme.colors.primary },
          ]}
          onPress={() => setMode('signUp')}
        >
          <Text
            variant="label"
            tone={mode === 'signUp' ? 'text' : 'textMuted'}
          >
            Create account
          </Text>
        </Pressable>
      </View>

      <Button
        label={googleBusy ? 'Opening Google…' : 'Continue with Google'}
        variant="secondary"
        onPress={onGoogle}
        loading={googleBusy}
        disabled={googleBusy || submitting}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
        <Text variant="caption" tone="textMuted" style={styles.dividerText}>
          or with email
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Input
        label={mode === 'signUp' ? `Password (min ${MIN_PASSWORD_LEN} chars)` : 'Password'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        label={mode === 'signIn' ? 'Sign in' : 'Send verification code'}
        onPress={submit}
        loading={submitting}
        disabled={!canSubmit}
      />

      {mode === 'signUp' ? (
        <Text
          variant="caption"
          tone="textMuted"
          style={{ textAlign: 'center', marginTop: spacing.md }}
        >
          We'll email you a 6-digit code to verify the address.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: spacing.md },
});
