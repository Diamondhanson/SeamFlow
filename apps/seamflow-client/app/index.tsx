import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useThemeColors } from '../lib/theme';

/**
 * Entry gate.
 *
 * Everyone lands on Discover — signed in or not. That's decision D-4: browsing
 * needs no account, and sending people to a sign-in wall before they've seen
 * any work asks for commitment before showing them the reason for it.
 */
export default function Index() {
  const { loading } = useAuth();
  const colors = useThemeColors();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href="/discover" />;
}
