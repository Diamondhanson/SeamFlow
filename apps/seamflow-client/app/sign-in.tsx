import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Text, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../components/Screen';
import { PasswordInput } from '../components/PasswordInput';
import {
  APPLE_SIGN_IN_ENABLED,
  AppleCancelledError,
  EmailNotConfirmedError,
  MIN_FULL_NAME_LEN,
  REQUIRE_EMAIL_VERIFICATION,
  SOCIAL_SIGN_IN_ENABLED,
  GoogleCancelledError,
  normaliseFullName,
  useAuth,
} from '../lib/auth-context';
import { spacing } from '../lib/theme';
import { useDialog } from '../lib/dialog';
import { useTranslation } from '../lib/i18n';
import { openLegal } from '../lib/legal-links';

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
  const { t, language } = useTranslation();
  const dialog = useDialog();
  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);

  // ── Validation: slow to complain, fast to forgive ─────────────────────────
  //
  // A field says nothing while it is being typed for the first time — flagging
  // "invalid email" after someone has typed "d" is hostile. It speaks on BLUR
  // (they've finished, judging it is fair) or once submit has been attempted.
  // After that it re-validates live, so the error clears the instant it is
  // fixed rather than making them leave the field again to find out.
  const [touched, setTouched] = useState<{
    fullName?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const trimmedEmail = email.trim();
  // Deliberately loose. This catches "forgot the @", it does not try to prove
  // deliverability — only sending the code does that. Stricter patterns reject
  // real addresses (plus-addressing, long TLDs, non-Latin domains).
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  // Both of these are sign-UP rules. Enforcing the length on sign-in would lock
  // out anyone whose existing password is shorter than today's minimum —
  // Supabase's own default is 6 — with no way to recover from this screen.
  const isSignUp = mode === 'signUp';
  const passwordTooShort = isSignUp && password.length < MIN_PASSWORD_LEN;
  const nameTooShort =
    isSignUp && normaliseFullName(fullName).length < MIN_FULL_NAME_LEN;

  const nameError = nameTooShort ? t('auth.fullNameTooShort') : undefined;
  const emailError = !trimmedEmail
    ? t('auth.emailRequired')
    : !isValidEmail
      ? t('auth.emailInvalid')
      : undefined;
  const passwordError = !password
    ? t('auth.passwordRequired')
    : passwordTooShort
      ? t('auth.passwordTooShort', { min: MIN_PASSWORD_LEN })
      : undefined;

  const showNameError = (touched.fullName || submitAttempted) && nameError;
  const showEmailError = (touched.email || submitAttempted) && emailError;
  const showPasswordError = (touched.password || submitAttempted) && passwordError;

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
    setSubmitAttempted(true);
    // Focus the first offending field rather than just painting it red — on a
    // phone the bad field may well be scrolled out of view.
    if (nameError) return nameRef.current?.focus();
    if (emailError) return emailRef.current?.focus();
    if (passwordError) return passwordRef.current?.focus();

    const normalisedEmail = trimmedEmail.toLowerCase();
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signInWithPassword(normalisedEmail, password);
        router.replace('/(app)');
      } else {
        await signUpWithPassword(normalisedEmail, password, fullName);
        // With REQUIRE_EMAIL_VERIFICATION off, signUpWithPassword has already
        // signed them in. The OTP screen is only reached via the
        // EmailNotConfirmedError path below, i.e. when the Supabase project
        // itself insists on confirmation.
        router.replace(
          REQUIRE_EMAIL_VERIFICATION
            ? `/verify-otp?email=${encodeURIComponent(normalisedEmail)}`
            : '/(app)',
        );
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
    <Screen scroll>
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
          onPress={() => {
            setMode('signIn');
            setSubmitAttempted(false);
          }}
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
          onPress={() => {
            setMode('signUp');
            // Sign-up adds a name rule and a password length rule — drop any
            // error raised under the old mode rather than showing it stale.
            setSubmitAttempted(false);
          }}
        >
          <Text
            variant="label"
            tone={mode === 'signUp' ? 'text' : 'textMuted'}
          >
            {t('auth.createAccount')}
          </Text>
        </Pressable>
      </View>

      {/* Social sign-in is off in the client app for now
          (SOCIAL_SIGN_IN_ENABLED): Google needs per-platform redirect URLs and
          Apple needs the paid developer program, and neither is needed to use
          the app. Email + password is the whole story here. */}
      {SOCIAL_SIGN_IN_ENABLED ? (
        <>
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
        </>
      ) : null}

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
        <Text variant="caption" tone="textMuted" style={styles.dividerText}>
          {t('auth.orWithEmail')}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.hairline }]} />
      </View>

      {/* Sign-up only. This is what a tailor sees in their inbox, so without it
          the chat list falls back to the client's raw email address. */}
      {mode === 'signUp' ? (
        <>
          <Input
            ref={nameRef}
            label={t('auth.fullName')}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
            error={showNameError || undefined}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <Text variant="caption" tone="textMuted" style={styles.fieldHint}>
            {t('auth.fullNameHint')}
          </Text>
        </>
      ) : null}

      <Input
        ref={emailRef}
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
        error={showEmailError || undefined}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordInput
        ref={passwordRef}
        label={mode === 'signUp' ? t('auth.passwordWithMin', { min: MIN_PASSWORD_LEN }) : t('auth.password')}
        value={password}
        onChangeText={setPassword}
        onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
        error={showPasswordError || undefined}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />

      {/*
        Never disabled for validation reasons — only while a request is in
        flight. A greyed-out button with no message is a dead end: people can't
        tell whether the app is broken or they are. Let them press it, then say
        what's wrong.
      */}
      <Button
        label={mode === 'signIn' ? t('auth.signIn') : t('auth.sendVerificationCode')}
        onPress={submit}
        loading={submitting}
        disabled={submitting || googleBusy || appleBusy}
      />

      {mode === 'signIn' ? (
        <Pressable
          onPress={() =>
            router.push(
              isValidEmail
                ? `/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
                : '/reset-password',
            )
          }
          hitSlop={8}
          style={{ marginTop: spacing.md }}
        >
          <Text variant="caption" tone="primary" style={{ textAlign: 'center' }}>
            {t('auth.forgotPassword')}
          </Text>
        </Pressable>
      ) : null}

      {mode === 'signUp' ? (
        <Text
          variant="caption"
          tone="textMuted"
          style={{ textAlign: 'center', marginTop: spacing.md }}
        >
          {t('auth.signUpHint')}
        </Text>
      ) : null}

      <Text
        variant="caption"
        tone="textMuted"
        style={{ textAlign: 'center', marginTop: spacing.xl }}
      >
        {t('auth.agreePrefix')}{' '}
        <Text variant="caption" tone="primary" onPress={() => openLegal('terms', language)}>
          {t('auth.termsWord')}
        </Text>{' '}
        {t('auth.agreeAnd')}{' '}
        <Text variant="caption" tone="primary" onPress={() => openLegal('privacy', language)}>
          {t('auth.privacyWord')}
        </Text>
        {t('auth.agreeSuffix')}
      </Text>
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
  fieldHint: { marginTop: -spacing.xs, marginBottom: spacing.sm },
});
