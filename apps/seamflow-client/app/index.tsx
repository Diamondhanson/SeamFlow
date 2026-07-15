import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useThemeColors } from '../lib/theme';

// Entry gate: send signed-in users into the app, everyone else to sign-in.
export default function Index() {
  const { session, loading } = useAuth();
  const colors = useThemeColors();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)' : '/sign-in'} />;
}
