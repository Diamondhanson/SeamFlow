import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useDeleteTemplate, useTemplate } from '../../../lib/queries';
import { colors, spacing } from '../../../lib/theme';

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, isLoading } = useTemplate(id);
  const del = useDeleteTemplate(id);

  const onDelete = () =>
    Alert.alert('Delete template?', `${template?.name} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          del.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (err) =>
              Alert.alert('Error', err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

  if (isLoading || !template) {
    return (
      <Screen>
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.name}>{template.name}</Text>
        {template.garmentType ? (
          <Text style={styles.muted}>Garment: {template.garmentType}</Text>
        ) : null}
        {template.description ? (
          <Text style={[styles.muted, { marginTop: spacing.sm }]}>
            {template.description}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.section}>
          Measurement fields ({template.fields.length})
        </Text>
        {template.fields.map((f, i) => (
          <Card key={`${f.key}_${i}`}>
            <CardTitle>{f.label}</CardTitle>
            <CardLine>Key: {f.key}</CardLine>
            <CardLine>Unit: {f.unit ?? 'cm'}</CardLine>
            <CardLine>{f.required ? 'Required' : 'Optional'}</CardLine>
          </Card>
        ))}

        <View style={styles.divider} />
        <Button label="Delete template" variant="danger" onPress={onDelete} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
});
