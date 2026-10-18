import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useFirstRun } from '../lib/first-run';
import { useMode } from '../lib/mode';
import { useThemeColors } from '../lib/theme';

export default function Index() {
  const { session, loading } = useAuth();
  const { mode, ready } = useMode();
  const firstRun = useFirstRun();
  const colors = useThemeColors();

  // Wait for auth, for the intro flag, and — when signed in — for the mode to
  // resolve from /me. The intro flag is cheap and must settle first: showing
  // the feed for a frame and then yanking it away to ask a question is worse
  // than a beat of splash.
  if (loading || !firstRun.ready || (session && !ready)) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Never been here before → the intro. Ahead of the session check on purpose:
  // a brand-new install is signed out, and the intro is the whole reason this
  // route exists. Someone who has seen it never comes back, including after
  // signing out — the flag belongs to the device (see lib/first-run).
  if (!firstRun.seen) return <Redirect href={'/welcome' as Href} />;

  // Signed out → public discovery (browsable without an account; signing in is
  // gated on action). A tailor signs in from the account entry on discovery.
  if (!session) return <Redirect href={'/(client)/discover' as Href} />;

  // Signed in → the experience their profile resolves to.
  return <Redirect href={(mode === 'tailor' ? '/(app)' : '/(client)') as Href} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
