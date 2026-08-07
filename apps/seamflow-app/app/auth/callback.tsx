// ============================================================================
// /auth/callback — the return leg of the browser Google sign-in.
//
// Native never reaches this screen: there, `openAuthSessionAsync` intercepts
// the deep link inside signInWithGoogle() and exchanges the code itself. On
// web there is no popup to intercept anything — Google redirects the whole tab
// here with `?code=…`, and this screen trades that code for a session.
//
// The exchange is done by hand rather than by supabase-js's `detectSessionInUrl`
// because that option is off (lib/supabase.ts) for the native flow's sake.
// Doing it explicitly also lets us clean the code out of the address bar, so a
// refresh or a shared URL can't replay a spent authorization code.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function AuthCallback() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  // React 18 StrictMode double-invokes effects in development. An auth code is
  // single-use, so a second exchange would fail and bounce a perfectly good
  // sign-in back to the sign-in screen.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const href = globalThis.location?.href;
      if (!href) {
        router.replace('/sign-in');
        return;
      }

      const url = new URL(href);
      // Providers report refusals in the query string (`error=access_denied`
      // when the user hits Cancel on Google's consent screen). That isn't a
      // failure worth an error message — just put them back where they were.
      if (url.searchParams.get('error')) {
        router.replace('/sign-in');
        return;
      }

      const code = url.searchParams.get('code');
      if (!code) {
        setFailed(true);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setFailed(true);
        return;
      }

      // Drop `?code=…` from history so a back-navigation or a copied URL can't
      // replay it. replaceState keeps the SPA router's state intact.
      try {
        globalThis.history?.replaceState({}, '', '/');
      } catch {
        // Non-critical — the redirect below leaves this URL anyway.
      }

      // Hand back to the root, which reads the (now present) session and sends
      // the user on to /(app) — including through the PIN gate when one is set.
      router.replace('/');
    })();
  }, []);

  useEffect(() => {
    if (!failed) return;
    const id = setTimeout(() => router.replace('/sign-in'), 2200);
    return () => clearTimeout(id);
  }, [failed]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {failed ? (
        <Text style={[styles.message, { color: colors.textMuted }]}>
          {t('auth.signInCouldNotComplete')}
        </Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {t('auth.finishingSignIn')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
});
