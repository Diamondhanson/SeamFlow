import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Card, CardTitle, CardLine } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useClients } from '../../../lib/queries';
import { ApiError } from '../../../lib/api';
import { colors, spacing } from '../../../lib/theme';

export default function ClientsList() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce search so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

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
              {item.email ? <CardLine>{item.email}</CardLine> : null}
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
