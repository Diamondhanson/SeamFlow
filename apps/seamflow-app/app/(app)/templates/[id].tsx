import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useDeleteTemplate, useTemplate } from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';

export default function TemplateDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: template, isLoading } = useTemplate(id);
  const del = useDeleteTemplate(id);
  const colors = useThemeColors();

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
        <Text variant="bodySm" tone="textMuted">Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="h1">{template.name}</Text>
        {template.garmentType ? (
          <Text variant="bodySm" tone="textMuted">Garment: {template.garmentType}</Text>
        ) : null}
        {template.description ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
            {template.description}
          </Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text variant="h3" style={{ marginBottom: spacing.md }}>
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

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Button label="Delete template" variant="danger" onPress={onDelete} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
});
