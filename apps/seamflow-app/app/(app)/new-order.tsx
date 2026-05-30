import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type {
  Client,
  MeasurementTemplate,
  MeasurementValues,
  TemplateField,
} from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Card, CardLine, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { DateField } from '../../components/DateField';
import { api } from '../../lib/api';
import { spacing, useThemeColors } from '../../lib/theme';

type Step = 'client' | 'measurements' | 'order';

export default function NewOrderWizard() {
  const colors = useThemeColors();
  const [step, setStep] = useState<Step>('client');

  // Step 1: client
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [pickedClient, setPickedClient] = useState<Client | null>(null);

  // Inline new-client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  // Step 2: measurements
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [pickedTemplate, setPickedTemplate] = useState<MeasurementTemplate | null>(null);
  const [measurementsValues, setMeasurementsValues] = useState<Record<string, string>>(
    {},
  );

  // Step 3: order
  const [orderName, setOrderName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDate, setOrderDate] = useState<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const loadClients = useCallback(async (q: string) => {
    try {
      const res = await api.clients.list({ limit: 50, q: q || undefined });
      setClients(res.items);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await api.measurementTemplates.list();
      setTemplates(res.items);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { loadClients(''); }, [loadClients]);
  useEffect(() => {
    if (step === 'measurements') loadTemplates();
  }, [step, loadTemplates]);

  // -------- Step 1: pick or create client --------
  const createClientInline = async () => {
    if (!newClientName || !newClientPhone || !newClientAddress) return;
    try {
      const c = await api.clients.create({
        fullName: newClientName.trim(),
        phone: newClientPhone.trim(),
        address: newClientAddress.trim(),
      });
      setPickedClient(c);
      setShowNewClientForm(false);
      setStep('measurements');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    }
  };

  const continueWithClient = (c: Client) => {
    setPickedClient(c);
    setStep('measurements');
  };

  // -------- Step 2: measurements --------
  const pickTemplate = (t: MeasurementTemplate | null) => {
    setPickedTemplate(t);
    // Seed empty values for each field
    if (t) {
      const seeded: Record<string, string> = {};
      for (const f of t.fields) seeded[f.key] = '';
      setMeasurementsValues(seeded);
    } else {
      setMeasurementsValues({});
    }
  };

  const setFieldValue = (key: string, v: string) =>
    setMeasurementsValues((cur) => ({ ...cur, [key]: v }));

  const goToOrderStep = () => {
    // Validate at least one numeric value if any field is required
    if (pickedTemplate) {
      for (const f of pickedTemplate.fields) {
        if (f.required && !measurementsValues[f.key]) {
          Alert.alert('Required field', `${f.label} is required by this template.`);
          return;
        }
      }
    }
    setStep('order');
  };

  // -------- Step 3: create everything --------
  const submitAll = async () => {
    if (!pickedClient || !orderName) return;
    setSubmitting(true);
    try {
      // 1. Save measurement set if we have any values
      const numericValues: MeasurementValues = {};
      for (const [k, v] of Object.entries(measurementsValues)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) numericValues[k] = n;
      }
      if (Object.keys(numericValues).length > 0) {
        await api.measurementSets.createForClient(pickedClient.id, {
          label: pickedTemplate?.name ?? 'default',
          templateId: pickedTemplate?.id ?? null,
          values: numericValues,
        });
      }

      // 2. Create the order. Inline the measurements into a single order item
      // so they're attached to the order as well as the client's measurement_set.
      const created = await api.orders.create({
        clientId: pickedClient.id,
        orderName,
        notes: orderNotes || null,
        dateDelivery: orderDate ? orderDate.toISOString() : null,
        items:
          Object.keys(numericValues).length > 0
            ? [
                {
                  garmentType: pickedTemplate?.garmentType ?? 'garment',
                  measurements: numericValues,
                  quantity: 1,
                },
              ]
            : undefined,
      });

      router.replace(`/(app)/orders/${created.id}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.stepRow}>
        <StepDot label="Client" active={step === 'client'} done={step !== 'client'} />
        <View style={[styles.stepBar, { backgroundColor: colors.border }]} />
        <StepDot
          label="Measurements"
          active={step === 'measurements'}
          done={step === 'order'}
        />
        <View style={[styles.stepBar, { backgroundColor: colors.border }]} />
        <StepDot label="Order" active={step === 'order'} done={false} />
      </View>

      {step === 'client' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Input
            label="Search existing clients"
            value={search}
            onChangeText={(v) => { setSearch(v); loadClients(v); }}
            placeholder="Name or phone"
          />
          <Button
            label="+ New client"
            variant="secondary"
            onPress={() => setShowNewClientForm(true)}
          />

          {showNewClientForm ? (
            <Card>
              <Input
                label="Full name *"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              <Input
                label="Phone *"
                value={newClientPhone}
                onChangeText={setNewClientPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <Input
                label="Address *"
                value={newClientAddress}
                onChangeText={setNewClientAddress}
                placeholder="Bonanjo, Douala"
                multiline
              />
              <Button
                label="Create + continue"
                onPress={createClientInline}
                disabled={!newClientName || !newClientPhone || !newClientAddress}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowNewClientForm(false)}
              />
            </Card>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Text variant="h3" tone="text" style={styles.section}>Existing clients</Text>
          {clients.length === 0 ? (
            <Text variant="bodySm" tone="textMuted">No clients yet.</Text>
          ) : (
            clients.map((c) => (
              <Card key={c.id} onPress={() => continueWithClient(c)}>
                <CardTitle>{c.fullName}</CardTitle>
                <CardLine>{c.phone}</CardLine>
              </Card>
            ))
          )}
        </ScrollView>
      ) : null}

      {step === 'measurements' && pickedClient ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text variant="body" tone="textMuted" style={styles.context}>
            Client: <Text variant="body" tone="text" style={styles.contextStrong}>{pickedClient.fullName}</Text>
          </Text>

          <Text variant="h3" tone="text" style={styles.section}>Pick a template</Text>
          <Text variant="bodySm" tone="textMuted">
            Templates define which measurements to ask for. Skip if you want loose
            entries.
          </Text>
          <View style={{ height: spacing.sm }} />
          <Button
            label={pickedTemplate ? `Using: ${pickedTemplate.name}` : 'No template (skip)'}
            variant="secondary"
            onPress={() => {
              const opts = templates.slice(0, 8).map((t) => ({
                text: t.name,
                onPress: () => pickTemplate(t),
              }));
              Alert.alert('Pick a template', undefined, [
                { text: 'No template', onPress: () => pickTemplate(null) },
                ...opts,
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          />
          <View style={{ height: spacing.lg }} />

          {pickedTemplate && pickedTemplate.fields.length > 0 ? (
            <>
              <Text variant="h3" tone="text" style={styles.section}>Measurements (cm)</Text>
              {pickedTemplate.fields.map((f) => (
                <Input
                  key={f.key}
                  label={`${f.label}${f.required ? ' *' : ''}`}
                  value={measurementsValues[f.key] ?? ''}
                  onChangeText={(v) => setFieldValue(f.key, v)}
                  keyboardType="numeric"
                  placeholder={`e.g. 88`}
                />
              ))}
            </>
          ) : null}

          {!pickedTemplate ? (
            <FreeMeasurements
              values={measurementsValues}
              setValues={setMeasurementsValues}
            />
          ) : null}

          <Button label="Next: order" onPress={goToOrderStep} />
        </ScrollView>
      ) : null}

      {step === 'order' && pickedClient ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text variant="body" tone="textMuted" style={styles.context}>
            Client: <Text variant="body" tone="text" style={styles.contextStrong}>{pickedClient.fullName}</Text>
          </Text>

          <Input
            label="Order name *"
            value={orderName}
            onChangeText={setOrderName}
            placeholder="Aso ebi outfit, Suit for wedding…"
          />
          <DateField
            label="Delivery date"
            value={orderDate}
            onChange={setOrderDate}
          />
          <Input
            label="Notes / design specifications"
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Optional"
            multiline
          />

          <Button
            label="Save"
            onPress={submitAll}
            loading={submitting}
            disabled={!orderName}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStep('measurements')}
          />
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function StepDot({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={dotStyles.wrap}>
      <View
        style={[
          dotStyles.dot,
          { backgroundColor: colors.cardElevated, borderColor: colors.border },
          active && { backgroundColor: colors.accent, borderColor: colors.accent },
          done && { backgroundColor: colors.success, borderColor: colors.success },
        ]}
      />
      <Text
        variant="caption"
        tone={active || done ? 'text' : 'textMuted'}
        style={dotStyles.label}
      >
        {label}
      </Text>
    </View>
  );
}

function FreeMeasurements({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: (cb: (cur: Record<string, string>) => Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = useState('');
  return (
    <View>
      <Text variant="h3" tone="text" style={styles.section}>Manual measurements (cm)</Text>
      {Object.entries(values).map(([k, v]) => (
        <Input
          key={k}
          label={k}
          value={v}
          onChangeText={(val) => setValues((cur) => ({ ...cur, [k]: val }))}
          keyboardType="numeric"
        />
      ))}
      <Input
        label="Add a field (e.g. chest)"
        value={newKey}
        onChangeText={setNewKey}
        autoCapitalize="none"
        onSubmitEditing={() => {
          if (!newKey) return;
          setValues((cur) => ({ ...cur, [newKey]: '' }));
          setNewKey('');
        }}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepBar: {
    flex: 1,
    height: 1,
    marginHorizontal: spacing.xs,
  },
  context: { marginBottom: spacing.md },
  contextStrong: { fontWeight: '600' },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});

const dotStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  label: { marginTop: 4 },
});
