import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { MeasurementTemplate } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { api, ApiError } from '../../../lib/api';
import { colors, spacing } from '../../../lib/theme';

export default function TemplatesList() {
  const [items, setItems] = useState<MeasurementTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.measurementTemplates.list();
      setItems(res.items);
    } catch (err) {
      if (err instanceof ApiError && err.isNotFound()) {
        Alert.alert(
          'Profile required',
          'Set up your business profile first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Profile', onPress: () => router.push('/(app)/me') },
          ],
        );
      } else {
        Alert.alert('Error', err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Text style={styles.intro}>
        Templates define which measurements to collect for a specific design or pattern.
        Reuse them when creating orders.
      </Text>
      <Button label="+ New template" onPress={() => router.push('/(app)/templates/new')} />
      <View style={{ height: spacing.lg }} />

      {loading && items.length === 0 ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>
          No templates yet. Create one to define measurement fields for a design.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/(app)/templates/${item.id}`)}>
              <CardTitle>{item.name}</CardTitle>
              {item.garmentType ? <CardLine>Garment: {item.garmentType}</CardLine> : null}
              <CardLine>
                {item.fields.length} field{item.fields.length === 1 ? '' : 's'}
              </CardLine>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
