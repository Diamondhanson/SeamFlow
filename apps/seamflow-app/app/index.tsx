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

  // Signed out → sign in. (Public client discovery becomes the entry in Phase 2.)
  if (!session) return <Redirect href="/sign-in" />;

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
