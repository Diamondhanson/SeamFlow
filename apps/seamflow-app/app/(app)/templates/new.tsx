import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { TemplateField } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { useCreateTemplate } from '../../../lib/queries';
import { colors, spacing } from '../../../lib/theme';

const STARTER_FIELDS: TemplateField[] = [
  { key: 'chest', label: 'Chest', required: true, unit: 'cm' },
  { key: 'waist', label: 'Waist', required: true, unit: 'cm' },
  { key: 'hips', label: 'Hips', required: false, unit: 'cm' },
];

export default function NewTemplate() {
  const [name, setName] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TemplateField[]>(STARTER_FIELDS);
  const create = useCreateTemplate();

  const addField = () =>
    setFields([
      ...fields,
      { key: `field_${fields.length + 1}`, label: 'New field', unit: 'cm' },
    ]);

  const updateField = (i: number, patch: Partial<TemplateField>) => {
    const copy = [...fields];
    copy[i] = { ...copy[i], ...patch };
    setFields(copy);
  };

  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name) return;
    create.mutate(
      {
        name,
        garmentType: garmentType || null,
        description: description || null,
        fields,
      },
      {
        onSuccess: (t) => {
          router.dismiss();
          router.push(`/(app)/templates/${t.id}`);
        },
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Input
          label="Template name *"
          value={name}
          onChangeText={setName}
          placeholder="Slim-fit suit"
        />
        <Input
          label="Garment type"
          value={garmentType}
          onChangeText={setGarmentType}
          placeholder="suit, gown, kaftan…"
          autoCapitalize="none"
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional design notes baked into the template"
          multiline
        />

        <Text style={styles.section}>Measurement fields</Text>
        {fields.map((f, i) => (
          <Card key={i}>
            <Input
              label={`Field ${i + 1} key`}
              value={f.key}
              onChangeText={(v) => updateField(i, { key: v })}
              autoCapitalize="none"
              placeholder="chest"
            />
            <Input
              label="Label"
              value={f.label}
              onChangeText={(v) => updateField(i, { label: v })}
              placeholder="Chest"
            />
            <View style={styles.row}>
              <Button
                label={f.required ? 'Required ✓' : 'Optional'}
                variant="secondary"
                onPress={() => updateField(i, { required: !f.required })}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label={f.unit === 'in' ? 'in' : 'cm'}
                variant="secondary"
                onPress={() => updateField(i, { unit: f.unit === 'in' ? 'cm' : 'in' })}
              />
            </View>
            <View style={{ height: spacing.sm }} />
            <Button label="Remove field" variant="danger" onPress={() => removeField(i)} />
          </Card>
        ))}

        <Button label="+ Add field" variant="secondary" onPress={addField} />
        <View style={{ height: spacing.lg }} />

        <Button
          label="Save template"
          onPress={submit}
          loading={create.isPending}
          disabled={!name || fields.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row' },
});
