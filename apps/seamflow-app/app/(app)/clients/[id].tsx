import type { MeasurementValues } from '@seamflow/schemas';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonDetail } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { HelpCard } from '../../../components/HelpCard';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { MeasurementSheetScan } from '../../../components/MeasurementSheetScan';
import {
  useClient,
  useCreateMeasurementSet,
  useDeleteClient,
  useDeleteMeasurementSet,
  useMe,
  useMeasurementSets,
  useOrders,
} from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { prettyMeasurementLabel } from '../../../lib/measurements';
import { useResponsiveValue } from '../../../lib/use-breakpoint';
import { useContactActions } from '../../../lib/contact-actions';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { draftKey, useDraft } from '../../../lib/drafts';

/** Starting contents of the manual measurement-set box. Also the yardstick for
 *  "has this been touched?" — see the draft wiring below. */
const BLANK_VALUES_JSON = '{\n  "chest": 88,\n  "waist": 70,\n  "hips": 96\n}';

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
  const contact = useContactActions();

  // Inline new-measurement-set form
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('default');
  const [valuesJson, setValuesJson] = useState(BLANK_VALUES_JSON);

  // Keep this form on the device as it is typed. It is the third place a
  // tailor can enter measurements, and it loses them the same way the order
  // wizard did: everything sits in state until the button is pressed.
  //
  // Untouched starting values are not "work" — only an edited label or edited
  // JSON counts, or every visit would open with a pointless restore prompt.
  const { clear: clearDraft } = useDraft({
    key: draftKey('client-set', id),
    value: { label, valuesJson },
    hasContent: (d) => d.label !== 'default' || d.valuesJson !== BLANK_VALUES_JSON,
    // The client's name comes from the screen, not the draft — the draft holds
    // only the measurement box, and the URL already fixes whose it is.
    describe: () => clientQ.data?.fullName ?? null,
    onRestore: (d) => {
      setLabel(d.label);
      setValuesJson(d.valuesJson);
      // Restoring is pointless if the form they were typing into is closed.
      setShowForm(true);
    },
  });
  // Scan-a-filled-sheet flow (photo → reviewed measurement set)
  const [scanOpen, setScanOpen] = useState(false);
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;

  const chooseAddMethod = async () => {
    const method = await dialog.choose<'scan' | 'manual'>({
      title: t('clients.addMeasurementsTitle'),
      message: t('clients.addMeasurementsBody'),
      actions: [
        { label: t('clients.scanFromPhoto'), value: 'scan' },
        { label: t('clients.enterByHand'), value: 'manual' },
      ],
    });
    if (method === 'scan') setScanOpen(true);
    else if (method === 'manual') setShowForm(true);
  };

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
          setValuesJson(BLANK_VALUES_JSON);
          clearDraft();
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
      <FormScroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {client.phone ? (
          <Pressable
            onPress={() => contact(client.phone)}
            hitSlop={6}
            style={styles.phoneRow}
            accessibilityRole="button"
            accessibilityLabel={t('clients.contactTitle')}
          >
            <Ionicons name="call-outline" size={15} color={colors.accent} />
            <Text variant="bodySm" tone="primary">{client.phone}</Text>
          </Pressable>
        ) : null}
        {client.address ? <Text variant="bodySm" tone="textMuted">{client.address}</Text> : null}
        {client.email ? <Text variant="bodySm" tone="textMuted">{client.email}</Text> : null}
        {client.notes ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>{client.notes}</Text>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        <HelpCard
          guideKey="flow.scanSheet"
          icon="camera-outline"
          title={t('guides.scanSheetTitle')}
          message={t('guides.scanSheetBody')}
        />
        <View style={styles.row}>
          <Text variant="h3">{t('clients.measurementSets')}</Text>
          {!showForm ? (
            <Button
              label={t('clients.addSet')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={chooseAddMethod}
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

        {/* Same shape as the measurements header above it. Starting an order
            was previously only reachable from the home screen, which meant
            looking a client up, memorising who they were, leaving, and finding
            them again in the wizard's own picker. */}
        <View style={styles.row}>
          <Text variant="h3">{t('clients.ordersCount', { count: orders.length })}</Text>
          <Button
            label={t('clients.newOrder')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(`/(app)/new-order?forClient=${id}`)}
          />
        </View>
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
      </FormScroll>

      <MeasurementSheetScan
        clientId={id}
        tailorId={tailorId}
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onManualFallback={() => setShowForm(true)}
      />
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
  set: { label: string; values: MeasurementValues; unitPreference: string };
}) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const colors = useThemeColors();
  const del = useDeleteMeasurementSet(setId, clientId);
  // Two columns on tablets/landscape, one on a phone — 17 measurements in a
  // single narrow column is a wall of text on a wide screen.
  const columns = useResponsiveValue({ compact: 1, medium: 2, expanded: 2 });
  const entries = Object.entries(set.values);

  return (
    <Card>
      <View style={styles.setHead}>
        <CardTitle>{set.label}</CardTitle>
        <Text variant="caption" tone="textMuted">
          {t('clients.setCount', { count: entries.length })}
        </Text>
      </View>

      {/* Label left, value right, hairline between rows: the eye scans one
          column of names and one column of numbers instead of decoding
          "NAME: 94 cm" run-ons. */}
      <View style={styles.measureGrid}>
        {entries.map(([k, v]) => (
          <View
            key={k}
            style={[
              styles.measureRow,
              { borderBottomColor: colors.hairline },
              columns > 1 && styles.measureRowHalf,
            ]}
          >
            <Text
              variant="bodySm"
              tone="textMuted"
              style={styles.measureLabel}
              numberOfLines={2}
            >
              {prettyMeasurementLabel(k)}
            </Text>
            <Text variant="bodySm" numeric style={styles.measureValue}>
              {String(v)} {set.unitPreference}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
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
  setHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  measureRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Two-up on wide screens: just under half so the columns keep a gutter.
  measureRowHalf: { width: '48%', marginRight: '4%' },
  measureLabel: { flex: 1 },
  measureValue: { flexShrink: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  divider: { height: 1, marginVertical: spacing.lg },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  jsonInput: { fontFamily: 'Courier', minHeight: 120 },
});
