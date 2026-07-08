import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { SkeletonDetail } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
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
import { spacing, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function ClientDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientQ = useClient(id);
  const setsQ = useMeasurementSets(id);
  const ordersQ = useOrders({ clientId: id });
  const createSet = useCreateMeasurementSet(id);
  const deleteClient = useDeleteClient(id);
  const colors = useThemeColors();
  const dialog = useDialog();
  const scroll = useFloatingScroll();

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

  const addSet = async () => {
    let parsed: Record<string, number>;
    try {
      parsed = JSON.parse(valuesJson);
    } catch {
      await dialog.alert({
        title: t('clients.invalidJsonTitle'),
        message: t('clients.invalidJsonBody'),
        tone: 'error',
      });
      return;
    }
    createSet.mutate(
      { label: label || 'default', values: parsed },
      {
        onSuccess: () => {
          setShowForm(false);
          setLabel('default');
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const onDeleteClient = async () => {
    const ok = await dialog.confirm({
      title: t('clients.deleteClientTitle'),
      message: t('clients.deleteConfirmBody', { name: client?.fullName ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteClient.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  if (loading || !client) {
    return (
      <Screen>
        <ScreenHeader title={t('clients.clientTitle')} />
        <SkeletonDetail />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={client.fullName} />
      <ScrollView
        {...scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <Text variant="bodySm" tone="textMuted">{client.phone}</Text>
        {client.address ? <Text variant="bodySm" tone="textMuted">{client.address}</Text> : null}
        {client.email ? <Text variant="bodySm" tone="textMuted">{client.email}</Text> : null}
        {client.notes ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>{client.notes}</Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <View style={styles.row}>
          <Text variant="h3">{t('clients.measurementSets')}</Text>
          {!showForm ? (
            <Button
              label={t('clients.addSet')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => setShowForm(true)}
            />
          ) : null}
        </View>

        {sets.length === 0 && !showForm ? (
          <Text variant="bodySm" tone="textMuted">{t('clients.noMeasurementSets')}</Text>
        ) : null}

        {sets.map((s) => (
          <MeasurementSetCard key={s.id} setId={s.id} clientId={id} set={s} />
        ))}

        {showForm ? (
          <Card>
            <Input label={t('clients.labelLabel')} value={label} onChangeText={setLabel} />
            <Input
              label={t('clients.valuesLabel')}
              value={valuesJson}
              onChangeText={setValuesJson}
              multiline
              numberOfLines={6}
              autoCapitalize="none"
              style={styles.jsonInput}
            />
            <Button label={t('clients.saveSet')} onPress={addSet} loading={createSet.isPending} />
            <View style={{ height: spacing.sm }} />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setShowForm(false)}
            />
          </Card>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <Text variant="h3">{t('clients.ordersCount', { count: orders.length })}</Text>
        {orders.length === 0 ? (
          <Text variant="bodySm" tone="textMuted">{t('clients.noOrders')}</Text>
        ) : (
          orders.map((o) => (
            <Card key={o.id} onPress={() => router.push(`/(app)/orders/${o.id}`)}>
              <CardTitle>{o.orderName}</CardTitle>
              <CardLine>{t('clients.statusLine', { status: o.status })}</CardLine>
              {o.dateDelivery ? (
                <CardLine>
                  {t('clients.deliveryLine', { date: new Date(o.dateDelivery).toLocaleDateString() })}
                </CardLine>
              ) : null}
            </Card>
          ))
        )}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Button label={t('clients.deleteClient')} variant="danger" onPress={onDeleteClient} />
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
  const { t } = useTranslation();
  const dialog = useDialog();
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
          label={t('common.delete')}
          variant="danger"
          loading={del.isPending}
          onPress={() =>
            del.mutate(undefined, {
              onError: (err) => void dialog.error(err),
            })
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  divider: { height: 1, marginVertical: spacing.lg },
  jsonInput: { fontFamily: 'Courier', minHeight: 120 },
});
