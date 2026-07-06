import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { CountryCode } from 'libphonenumber-js';
import type {
  Client,
  MeasurementTemplate,
  MeasurementValues,
  TemplateField,
} from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, CardLine, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { DateField } from '../../components/DateField';
import { ContactPickerModal } from '../../components/ContactPickerModal';
import { api } from '../../lib/api';
import { useMe } from '../../lib/queries';
import type { DeviceContact } from '../../lib/contacts';
import { spacing, useThemeColors } from '../../lib/theme';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useDialog } from '../../lib/dialog';
import { useTranslation } from '../../lib/i18n';

/** A person chosen for the order who isn't a saved client yet (picked from
 *  phone contacts). Materialized into a client on the server at submit. */
type PickedContact = { fullName: string; phone: string };

type Step = 'client' | 'measurements' | 'order';

export default function NewOrderWizard() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const dialog = useDialog();
  const [step, setStep] = useState<Step>('client');

  // Step 1: client
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [pickedClient, setPickedClient] = useState<Client | null>(null);
  // A contact picked from the phone book that isn't a saved client yet.
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);

  // Default region for normalizing contact numbers to E.164.
  const { data: me } = useMe();
  const defaultCountry = ((me?.tailor?.countryCode as CountryCode) || 'NG');

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
      void dialog.error(err);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await api.measurementTemplates.list();
      setTemplates(res.items);
    } catch (err) {
      void dialog.error(err);
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
      setPickedContact(null);
      setPickedClient(c);
      setShowNewClientForm(false);
      setStep('measurements');
    } catch (err) {
      void dialog.error(err);
    }
  };

  const continueWithClient = (c: Client) => {
    setPickedContact(null);
    setPickedClient(c);
    setStep('measurements');
  };

  // A contact was picked from the phone book. Reuse an existing client if one
  // already has this number; otherwise carry the contact forward and let the
  // server materialize a client when the order is saved.
  const onPickContact = async (contact: DeviceContact) => {
    setContactsOpen(false);
    try {
      const res = await api.clients.list({ q: contact.phone, limit: 10 });
      const match = res.items.find((c) => c.phone === contact.phone);
      if (match) {
        continueWithClient(match);
        return;
      }
    } catch {
      // Non-fatal — fall through to treating them as a new contact.
    }
    setPickedClient(null);
    setPickedContact({ fullName: contact.name, phone: contact.phone });
    setStep('measurements');
  };

  // Name to show in later steps, whichever source the person came from.
  const pickedName = pickedClient?.fullName ?? pickedContact?.fullName ?? '';
  const hasPicked = !!pickedClient || !!pickedContact;

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

  const goToOrderStep = async () => {
    // Validate at least one numeric value if any field is required
    if (pickedTemplate) {
      for (const f of pickedTemplate.fields) {
        if (f.required && !measurementsValues[f.key]) {
          await dialog.alert({
            title: t('orders.requiredFieldTitle'),
            message: t('orders.requiredFieldMessage', { label: f.label }),
            tone: 'warning',
          });
          return;
        }
      }
    }
    setStep('order');
  };

  // -------- Step 3: create everything --------
  const submitAll = async () => {
    if (!hasPicked || !orderName) return;
    setSubmitting(true);
    try {
      // Collect any numeric measurement values entered.
      const numericValues: MeasurementValues = {};
      for (const [k, v] of Object.entries(measurementsValues)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) numericValues[k] = n;
      }
      const hasMeasurements = Object.keys(numericValues).length > 0;

      // For an existing client we can save the measurement set up front. For a
      // picked contact there's no client id yet — we save it after the order
      // materializes the client (below).
      if (pickedClient && hasMeasurements) {
        await api.measurementSets.createForClient(pickedClient.id, {
          label: pickedTemplate?.name ?? 'default',
          templateId: pickedTemplate?.id ?? null,
          values: numericValues,
        });
      }

      // Create the order. Pass either the existing clientId or the picked
      // contact for the server to materialize into a client. Measurements are
      // also inlined as an order item so they're attached to the order itself.
      const created = await api.orders.create({
        ...(pickedClient
          ? { clientId: pickedClient.id }
          : { contact: { fullName: pickedContact!.fullName, phone: pickedContact!.phone } }),
        orderName,
        notes: orderNotes || null,
        dateDelivery: orderDate ? orderDate.toISOString() : null,
        items: hasMeasurements
          ? [
              {
                garmentType: pickedTemplate?.garmentType ?? 'garment',
                measurements: numericValues,
                quantity: 1,
              },
            ]
          : undefined,
      });

      // Contact path: the order just created the client — save the reference
      // measurement set against the materialized client id.
      if (!pickedClient && hasMeasurements) {
        await api.measurementSets.createForClient(created.clientId, {
          label: pickedTemplate?.name ?? 'default',
          templateId: pickedTemplate?.id ?? null,
          values: numericValues,
        });
      }

      router.replace(`/(app)/orders/${created.id}`);
    } catch (err) {
      void dialog.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={t('orders.newTitle')} />
      <View style={styles.stepRow}>
        <StepDot label={t('orders.stepClient')} active={step === 'client'} done={step !== 'client'} />
        <View style={[styles.stepBar, { backgroundColor: colors.border }]} />
        <StepDot
          label={t('orders.stepMeasurements')}
          active={step === 'measurements'}
          done={step === 'order'}
        />
        <View style={[styles.stepBar, { backgroundColor: colors.border }]} />
        <StepDot label={t('orders.stepOrder')} active={step === 'order'} done={false} />
      </View>

      {step === 'client' ? (
        <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
          <Input
            label={t('orders.searchExistingClients')}
            value={search}
            onChangeText={(v) => { setSearch(v); loadClients(v); }}
            placeholder={t('orders.searchClientsPlaceholder')}
          />
          <Button
            label={t('orders.selectFromContacts')}
            variant="secondary"
            onPress={() => setContactsOpen(true)}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label={t('orders.newClient')}
            variant="secondary"
            onPress={() => setShowNewClientForm(true)}
          />

          {showNewClientForm ? (
            <Card>
              <Input
                label={t('orders.fullNameLabel')}
                value={newClientName}
                onChangeText={setNewClientName}
              />
              <PhoneInput
                label={t('orders.phoneLabel')}
                value={newClientPhone}
                onChangeText={setNewClientPhone}
              />
              <Input
                label={t('orders.addressLabel')}
                value={newClientAddress}
                onChangeText={setNewClientAddress}
                placeholder={t('orders.addressPlaceholder')}
                multiline
              />
              <Button
                label={t('orders.createAndContinue')}
                onPress={createClientInline}
                disabled={!newClientName || !newClientPhone || !newClientAddress}
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setShowNewClientForm(false)}
              />
            </Card>
          ) : null}

          <View style={{ height: spacing.md }} />
          <Text variant="h3" tone="text" style={styles.section}>{t('orders.existingClients')}</Text>
          {clients.length === 0 ? (
            <Text variant="bodySm" tone="textMuted">{t('orders.noClientsYet')}</Text>
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

      {step === 'measurements' && hasPicked ? (
        <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
          <Text variant="body" tone="textMuted" style={styles.context}>
            <Text variant="body" tone="text" style={styles.contextStrong}>{t('orders.clientLabel', { name: pickedName })}</Text>
          </Text>

          <Text variant="h3" tone="text" style={styles.section}>{t('orders.pickTemplate')}</Text>
          <Text variant="bodySm" tone="textMuted">
            {t('orders.templateHint')}
          </Text>
          <View style={{ height: spacing.sm }} />
          <Button
            label={pickedTemplate ? t('orders.usingTemplate', { name: pickedTemplate.name }) : t('orders.noTemplateSkip')}
            variant="secondary"
            onPress={async () => {
              const key = await dialog.pick({
                title: t('orders.pickTemplate'),
                selectedKey: pickedTemplate?.id ?? '__none__',
                options: [
                  { key: '__none__', label: t('orders.noTemplateOption') },
                  ...templates.map((tpl) => ({ key: tpl.id, label: tpl.name })),
                ],
              });
              if (!key) return;
              if (key === '__none__') {
                pickTemplate(null);
              } else {
                const picked = templates.find((tpl) => tpl.id === key);
                if (picked) pickTemplate(picked);
              }
            }}
          />
          <View style={{ height: spacing.lg }} />

          {pickedTemplate && pickedTemplate.fields.length > 0 ? (
            <>
              <Text variant="h3" tone="text" style={styles.section}>{t('orders.measurementsCm')}</Text>
              {pickedTemplate.fields.map((f) => (
                <Input
                  key={f.key}
                  label={`${f.label}${f.required ? ' *' : ''}`}
                  value={measurementsValues[f.key] ?? ''}
                  onChangeText={(v) => setFieldValue(f.key, v)}
                  keyboardType="numeric"
                  placeholder={t('orders.measurementPlaceholder')}
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

          <Button label={t('orders.nextOrder')} onPress={goToOrderStep} />
        </ScrollView>
      ) : null}

      {step === 'order' && hasPicked ? (
        <ScrollView {...scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
          <Text variant="body" tone="textMuted" style={styles.context}>
            <Text variant="body" tone="text" style={styles.contextStrong}>{t('orders.clientLabel', { name: pickedName })}</Text>
          </Text>

          <Input
            label={t('orders.orderNameLabel')}
            value={orderName}
            onChangeText={setOrderName}
            placeholder={t('orders.orderNamePlaceholder')}
          />
          <DateField
            label={t('orders.deliveryDate')}
            value={orderDate}
            onChange={setOrderDate}
          />
          <Input
            label={t('orders.notesLabel')}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder={t('common.optional')}
            multiline
          />

          <Button
            label={t('common.save')}
            onPress={submitAll}
            loading={submitting}
            disabled={!orderName}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label={t('common.back')}
            variant="secondary"
            onPress={() => setStep('measurements')}
          />
        </ScrollView>
      ) : null}

      <ContactPickerModal
        visible={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onSelect={onPickContact}
        defaultCountry={defaultCountry}
      />
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
  const { t } = useTranslation();
  const [newKey, setNewKey] = useState('');
  return (
    <View>
      <Text variant="h3" tone="text" style={styles.section}>{t('orders.manualMeasurementsCm')}</Text>
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
        label={t('orders.addFieldLabel')}
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
