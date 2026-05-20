import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  useClient,
  useCreateMeasurementSet,
  useDeleteClient,
  useDeleteMeasurementSet,
  useMeasurementSets,
  useOrders,
} from '../../../lib/queries';
import { colors, spacing } from '../../../lib/theme';

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientQ = useClient(id);
  const setsQ = useMeasurementSets(id);
  const ordersQ = useOrders({ clientId: id });
  const createSet = useCreateMeasurementSet(id);
  const deleteClient = useDeleteClient(id);

  // Inline new-measurement-set form
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('default');
  const [valuesJson, setValuesJson] = useState(
    '{\n  "chest": 88,\n  "waist": 70,\n  "hips": 96\n}',
  );

  const client = clientQ.data ?? null;
  const sets = setsQ.data?.items ?? [];
  const orders = ordersQ.data?.items ?? [];
  const loading = clientQ.isLoading;

  const addSet = () => {
    let parsed: Record<string, number>;
    try {
      parsed = JSON.parse(valuesJson);
    } catch {
      Alert.alert('Invalid JSON', 'Measurements must be a JSON object of numbers.');
      return;
    }
    createSet.mutate(
      { label: label || 'default', values: parsed },
      {
        onSuccess: () => {
          setShowForm(false);
          setLabel('default');
        },
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const onDeleteClient = () =>
    Alert.alert('Delete client?', `${client?.fullName} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteClient.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (err) =>
              Alert.alert('Error', err instanceof Error ? err.message : String(err)),
          }),
      },
    ]);

  if (loading || !client) {
    return (
      <Screen>
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.name}>{client.fullName}</Text>
        <Text style={styles.muted}>{client.phone}</Text>
        {client.address ? <Text style={styles.muted}>{client.address}</Text> : null}
        {client.email ? <Text style={styles.muted}>{client.email}</Text> : null}
        {client.notes ? (
          <Text style={[styles.muted, { marginTop: spacing.sm }]}>{client.notes}</Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.section}>Measurement sets</Text>
          {!showForm ? (
            <Button label="+ Add" variant="secondary" onPress={() => setShowForm(true)} />
          ) : null}
        </View>

        {sets.length === 0 && !showForm ? (
          <Text style={styles.muted}>No measurement sets yet.</Text>
        ) : null}

        {sets.map((s) => (
          <MeasurementSetCard key={s.id} setId={s.id} clientId={id} set={s} />
        ))}

        {showForm ? (
          <Card>
            <Input label="Label" value={label} onChangeText={setLabel} />
            <Input
              label="Values (JSON object, cm)"
              value={valuesJson}
              onChangeText={setValuesJson}
              multiline
              numberOfLines={6}
              autoCapitalize="none"
              style={styles.jsonInput}
            />
            <Button label="Save set" onPress={addSet} loading={createSet.isPending} />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setShowForm(false)}
            />
          </Card>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.section}>Orders ({orders.length})</Text>
        {orders.length === 0 ? (
          <Text style={styles.muted}>No orders for this client yet.</Text>
        ) : (
          orders.map((o) => (
            <Card key={o.id} onPress={() => router.push(`/(app)/orders/${o.id}`)}>
              <CardTitle>{o.orderName}</CardTitle>
              <CardLine>Status: {o.status}</CardLine>
              {o.dateDelivery ? (
                <CardLine>
                  Delivery: {new Date(o.dateDelivery).toLocaleDateString()}
                </CardLine>
              ) : null}
            </Card>
          ))
        )}

        <View style={styles.divider} />
        <Button label="Delete client" variant="danger" onPress={onDeleteClient} />
      </ScrollView>
    </Screen>
  );
}

function MeasurementSetCard({
  setId,
  clientId,
  set,
}: {
  setId: string;
  clientId: string;
  set: { label: string; values: Record<string, number>; unitPreference: string };
}) {
  const del = useDeleteMeasurementSet(setId, clientId);
  return (
    <Card>
      <CardTitle>{set.label}</CardTitle>
      {Object.entries(set.values).map(([k, v]) => (
        <CardLine key={k}>
          {k}: {String(v)} {set.unitPreference}
        </CardLine>
      ))}
      <View style={{ marginTop: spacing.sm }}>
        <Button
          label="Delete"
          variant="danger"
          loading={del.isPending}
          onPress={() =>
            del.mutate(undefined, {
              onError: (err) =>
                Alert.alert('Error', err instanceof Error ? err.message : String(err)),
            })
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  section: { color: colors.text, fontSize: 18, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  jsonInput: { fontFamily: 'Courier', minHeight: 120 },
});
