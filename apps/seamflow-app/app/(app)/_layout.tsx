import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'SeamFlow' }} />
      <Stack.Screen name="me" options={{ title: 'Profile' }} />
      <Stack.Screen name="new-order" options={{ title: 'New Order' }} />
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen
        name="clients/new"
        options={{ title: 'New Client', presentation: 'modal' }}
      />
      <Stack.Screen name="clients/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="groups/index" options={{ title: 'Group Orders' }} />
      <Stack.Screen
        name="groups/new"
        options={{ title: 'New Group Order', presentation: 'modal' }}
      />
      <Stack.Screen name="groups/[id]" options={{ title: 'Group' }} />
      <Stack.Screen name="templates/index" options={{ title: 'Templates' }} />
      <Stack.Screen
        name="templates/new"
        options={{ title: 'New Template', presentation: 'modal' }}
      />
      <Stack.Screen name="templates/[id]" options={{ title: 'Template' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
