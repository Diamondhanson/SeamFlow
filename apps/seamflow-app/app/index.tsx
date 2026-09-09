import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useMode } from '../lib/mode';
import { useThemeColors } from '../lib/theme';

export default function Index() {
  const { session, loading } = useAuth();
  const { mode, ready } = useMode();
  const colors = useThemeColors();

  // Wait for auth and, when signed in, for the mode to resolve from /me.
  if (loading || (session && !ready)) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

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
