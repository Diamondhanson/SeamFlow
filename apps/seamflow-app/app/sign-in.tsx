import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import {
  APPLE_SIGN_IN_ENABLED,
  AppleCancelledError,
  EmailNotConfirmedError,
  GoogleCancelledError,
  useAuth,
} from '../lib/auth-context';
import { spacing } from '../lib/theme';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';

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
  const { signInWithPassword, signUpWithPassword, signInWithGoogle, signInWithApple } =
    useAuth();
  const theme = useAtelierTheme();
  const { t } = useTranslation();
  const dialog = useDialog();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);

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
      const msg = err instanceof Error ? err.message : t('auth.googleSignInFailed');
      await dialog.alert({ title: t('auth.googleSignInFailed'), message: msg, tone: 'error' });
    } finally {
      setGoogleBusy(false);
    }
  };

  const onApple = async () => {
    // Not wired to a real provider yet — show a "coming soon" dialog instead of
    // invoking the native flow. Flip APPLE_SIGN_IN_ENABLED (see auth-context /
    // docs/apple-sign-in.md) once Apple + Supabase are configured and the app is
    // rebuilt; the branch below then runs the real sign-in.
    if (!APPLE_SIGN_IN_ENABLED) {
      await dialog.alert({
        title: t('auth.appleComingSoonTitle'),
        message: t('auth.appleComingSoonMessage'),
      });
      return;
    }
    if (appleBusy) return;
    setAppleBusy(true);
    try {
      await signInWithApple();
      router.replace('/(app)');
    } catch (err) {
      if (err instanceof AppleCancelledError) return;
      const msg = err instanceof Error ? err.message : t('auth.appleSignInFailed');
      await dialog.alert({ title: t('auth.appleSignInFailed'), message: msg, tone: 'error' });
    } finally {
      setAppleBusy(false);
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
      const title = mode === 'signIn' ? t('auth.signInFailed') : t('auth.signUpFailed');
      const msg = err instanceof Error ? err.message : title;
      await dialog.alert({ title, message: msg, tone: 'error' });
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
          {t('auth.tagline')}
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
            {t('auth.signIn')}
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
            {t('auth.createAccount')}
          </Text>
        </Pressable>
      </View>

      <Button
        label={googleBusy ? t('auth.openingGoogle') : t('auth.continueWithGoogle')}
        variant="secondary"
        onPress={onGoogle}
        loading={googleBusy}
        disabled={googleBusy || appleBusy || submitting}
      />

      {/*
        Apple Sign-In. Shown on every platform for now so it's visible while we
        develop; tapping it shows a "coming soon" dialog (APPLE_SIGN_IN_ENABLED
        is false). At activation, gate this to iOS only — Apple requires it on
        iOS (App Store 4.8) but it's uncommon on Android:
            {Platform.OS === 'ios' && ( <Button … /> )}
      */}
      <View style={styles.appleButton}>
        <Button
          label={appleBusy ? t('auth.openingApple') : t('auth.continueWithApple')}
          variant="secondary"
          onPress={onApple}
          loading={appleBusy}
          disabled={googleBusy || appleBusy || submitting}
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
        <Text variant="caption" tone="textMuted" style={styles.dividerText}>
          {t('auth.orWithEmail')}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
      </View>

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Input
        label={mode === 'signUp' ? t('auth.passwordWithMin', { min: MIN_PASSWORD_LEN }) : t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        label={mode === 'signIn' ? t('auth.signIn') : t('auth.sendVerificationCode')}
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
          {t('auth.signUpHint')}
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
  appleButton: {
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: spacing.md },
});
