import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Card, CardTitle, CardLine } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useClients } from '../../../lib/queries';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { ApiError } from '../../../lib/api';
import { colors, spacing } from '../../../lib/theme';

export default function ClientsList() {
  const [q, setQ] = useState('');
  // Debounce search so we don't refetch on every keystroke. The API uses
  // trigram-backed ILIKE on full_name + phone (GIN indexes from 0001), so
  // even fat-fingered partial matches like "ad" return quickly.
  const debouncedQ = useDebouncedValue(q, 300);

  const { data, isLoading, error } = useClients(debouncedQ);

  // Surface the "no tailor profile yet" error specifically.
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
      <Input
        label="Search by name or phone"
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        placeholder="Ada, +234..."
      />
      <Button label="+ New client" onPress={() => router.push('/(app)/clients/new')} />
      <View style={{ height: spacing.lg }} />

      {isLoading && items.length === 0 ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>No clients yet. Tap "+ New client" to add one.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(app)/clients/${item.id}`)}>
              <CardTitle>{item.fullName}</CardTitle>
              <CardLine>{item.phone}</CardLine>
              {item.address ? <CardLine>{item.address}</CardLine> : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
