import { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useGroupOrders } from '../../../lib/queries';
import { ApiError } from '../../../lib/api';
import { spacing } from '../../../lib/theme';

export default function GroupsList() {
  const { data, isLoading, error } = useGroupOrders();

  useEffect(() => {
    if (error instanceof ApiError && error.isNotFound()) {
      Alert.alert('Profile required', 'Set up your business profile first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to profile', onPress: () => router.push('/(app)/me') },
      ]);
    }
  }, [error]);

  const items = data?.items ?? [];

  return (
    <Screen>
      <Button label="+ New group order" onPress={() => router.push('/(app)/groups/new')} />
      <View style={{ height: spacing.lg }} />

      {isLoading && items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          Loading…
        </Text>
      ) : items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          No group orders yet.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(app)/groups/${item.id}`)}>
              <CardTitle>{item.name}</CardTitle>
              {item.eventDate ? (
                <CardLine>Event: {new Date(item.eventDate).toLocaleDateString()}</CardLine>
              ) : null}
              <CardLine>Status: {item.status}</CardLine>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { textAlign: 'center', marginTop: spacing.xl },
});
