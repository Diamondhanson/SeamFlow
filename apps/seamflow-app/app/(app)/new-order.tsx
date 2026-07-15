import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { CountryCode } from 'libphonenumber-js';
import type {
  Client,
  MeasurementTemplate,
  MeasurementValues,
} from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { HelpCard } from '../../components/HelpCard';
import { InfoDot } from '../../components/InfoDot';
import { TidyNotesSheet } from '../../components/TidyNotesSheet';
import { Card, CardLine, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { DateField } from '../../components/DateField';
import { ContactPickerModal } from '../../components/ContactPickerModal';
import { FabricField } from '../../components/FabricField';
import { api } from '../../lib/api';
import { useMe, useOrder, useClient } from '../../lib/queries';
import type { DeviceContact } from '../../lib/contacts';
import { spacing, useThemeColors } from '../../lib/theme';
import { useFloatingScroll } from '../../lib/floating-scroll';
import { useDialog } from '../../lib/dialog';
import { useGuides } from '../../lib/guides';
import { useTranslation } from '../../lib/i18n';

/** A person chosen for the order who isn't a saved client yet (picked from
 *  phone contacts). Materialized into a client on the server at submit. */
type PickedContact = { fullName: string; phone: string };

type Step = 'client' | 'measurements' | 'order';

/** One garment being added to the order — its type, an optional measurement
 *  template, the entered measurements, and how many of it to sew. An order can
 *  hold several of these. */
type GarmentDraft = {
  id: string;
  template: MeasurementTemplate | null;
  garmentType: string;
  values: Record<string, string>;
  quantity: string;
};

let garmentSeq = 0;
const makeGarment = (): GarmentDraft => ({
  id: `g${garmentSeq++}`,
  template: null,
  garmentType: '',
  values: {},
  quantity: '1',
});

/** Extract the positive-numeric measurement values from a garment's raw inputs. */
function numericMeasurements(values: Record<string, string>): MeasurementValues {
  const out: MeasurementValues = {};
  for (const [k, v] of Object.entries(values)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export default function NewOrderWizard() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const dialog = useDialog();
  const { isDismissed, dismiss } = useGuides();
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

  // "Duplicate / repeat order": ?duplicateFrom=<orderId> pre-fills the wizard
  // from an existing order (same client, garments, measurements, notes, fabric).
  const { duplicateFrom } = useLocalSearchParams<{ duplicateFrom?: string }>();
  const dupOrderQ = useOrder(duplicateFrom ?? '');
  const dupClientQ = useClient(dupOrderQ.data?.clientId ?? '');
  const seededRef = useRef(false);

  // Inline new-client form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  // Step 2: garments (one order can hold several garments to sew)
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [garments, setGarments] = useState<GarmentDraft[]>([makeGarment()]);

  // Step 3: order
  const [orderName, setOrderName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDate, setOrderDate] = useState<Date | null>(null);
  const [fabricId, setFabricId] = useState<string | null>(null);
  const [fabricYardage, setFabricYardage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [tidyOpen, setTidyOpen] = useState(false);

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

  // Seed the wizard from an existing order once (duplicate / repeat). Templates
  // aren't stored on order items, so measurements come back as manual entries.
  useEffect(() => {
    if (!duplicateFrom || seededRef.current) return;
    const order = dupOrderQ.data;
    const client = dupClientQ.data;
    if (!order || !client) return;
    seededRef.current = true;

    setPickedClient(client);
    const items = order.items.length ? order.items : [];
    setGarments(
      items.length
        ? items.map((it) => {
            const values: Record<string, string> = {};
            for (const [k, v] of Object.entries(it.measurements ?? {})) {
              values[k] = String(v);
            }
            return {
              ...makeGarment(),
              // submitAll defaults a blank type to 'garment' — show it blank again.
              garmentType: it.garmentType === 'garment' ? '' : it.garmentType,
              values,
              quantity: String(it.quantity ?? 1),
            };
          })
        : [makeGarment()],
    );
    setOrderName(order.orderName);
    setOrderNotes(order.notes ?? '');
    setFabricId(order.fabricId);
    setFabricYardage(order.fabricYardageUsed ?? '');
    // Client is known — jump straight to reviewing the garments/measurements.
    setStep('measurements');
  }, [duplicateFrom, dupOrderQ.data, dupClientQ.data]);

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

  // -------- Step 2: garments --------
  const updateGarment = (id: string, patch: Partial<GarmentDraft>) =>
    setGarments((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const setGarmentField = (id: string, key: string, v: string) =>
    setGarments((gs) =>
      gs.map((g) => (g.id === id ? { ...g, values: { ...g.values, [key]: v } } : g)),
    );

  const pickTemplateForGarment = (id: string, tpl: MeasurementTemplate | null) =>
    setGarments((gs) =>
      gs.map((g) => {
        if (g.id !== id) return g;
        const seeded: Record<string, string> = {};
        if (tpl) for (const f of tpl.fields) seeded[f.key] = '';
        return {
          ...g,
          template: tpl,
          values: seeded,
          // Adopt the template's garment type, but never clobber a name the
          // tailor already typed.
          garmentType: g.garmentType || (tpl?.garmentType ?? ''),
        };
      }),
    );

  const addGarment = () => setGarments((gs) => [...gs, makeGarment()]);
  const removeGarment = (id: string) =>
    setGarments((gs) => (gs.length > 1 ? gs.filter((g) => g.id !== id) : gs));

  const goToOrderStep = async () => {
    for (const [idx, g] of garments.entries()) {
      if (!g.garmentType.trim()) {
        await dialog.alert({
          title: t('orders.garmentTypeRequiredTitle'),
          message: t('orders.garmentTypeRequiredMessage', { n: idx + 1 }),
          tone: 'warning',
        });
        return;
      }
      if (g.template) {
        for (const f of g.template.fields) {
          if (f.required && !g.values[f.key]) {
            await dialog.alert({
              title: t('orders.requiredFieldTitle'),
              message: t('orders.requiredFieldMessage', { label: f.label }),
              tone: 'warning',
            });
            return;
          }
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
      // Build one order item per garment.
      const items = garments.map((g) => {
        const measurements = numericMeasurements(g.values);
        const qty = Math.floor(Number(g.quantity));
        return {
          garmentType: g.garmentType.trim() || 'garment',
          measurements: Object.keys(measurements).length ? measurements : undefined,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        };
      });

      // Save each garment's measurements against the existing client for reuse.
      if (pickedClient) {
        for (const g of garments) {
          const measurements = numericMeasurements(g.values);
          if (Object.keys(measurements).length) {
            await api.measurementSets.createForClient(pickedClient.id, {
              label: g.template?.name ?? g.garmentType.trim() ?? 'default',
              templateId: g.template?.id ?? null,
              values: measurements,
            });
          }
        }
      }

      // Create the order with all its garments.
      const created = await api.orders.create({
        ...(pickedClient
          ? { clientId: pickedClient.id }
          : { contact: { fullName: pickedContact!.fullName, phone: pickedContact!.phone } }),
        orderName,
        notes: orderNotes || null,
        dateDelivery: orderDate ? orderDate.toISOString() : null,
        fabricId,
        fabricYardageUsed: fabricYardage.trim() ? Number(fabricYardage) : null,
        items: items.length ? items : undefined,
      });

      // Contact path: the order just materialized the client — save each
      // garment's measurements against the new client id.
      if (!pickedClient) {
        for (const g of garments) {
          const measurements = numericMeasurements(g.values);
          if (Object.keys(measurements).length) {
            await api.measurementSets.createForClient(created.clientId, {
              label: g.template?.name ?? g.garmentType.trim() ?? 'default',
              templateId: g.template?.id ?? null,
              values: measurements,
            });
          }
        }
      }

      // First order ever → a one-time reassuring confirmation before we land
      // on the order. Shows only once per device (remembered by GuidesProvider).
      if (!isDismissed('success.firstOrder')) {
        dismiss('success.firstOrder');
        await dialog.alert({
          title: t('guides.firstOrderTitle'),
          message: t('guides.firstOrderBody'),
          tone: 'success',
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
          <HelpCard
            guideKey="flow.newOrder"
            title={t('guides.newOrderTitle')}
            message={t('guides.newOrderBody')}
          />
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
          <Text variant="bodySm" tone="textMuted">{t('orders.garmentsHint')}</Text>
          <View style={{ height: spacing.sm }} />

          {garments.map((g, idx) => (
            <Card key={g.id}>
              <View style={styles.garmentHead}>
                <CardTitle>{t('orders.garmentLabel', { n: idx + 1 })}</CardTitle>
                {garments.length > 1 ? (
                  <Pressable onPress={() => removeGarment(g.id)} hitSlop={10} accessibilityRole="button">
                    <Text variant="bodySm" style={{ color: colors.danger }}>
                      {t('orders.removeGarment')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Input
                label={t('orders.garmentTypeLabel')}
                value={g.garmentType}
                onChangeText={(v) => updateGarment(g.id, { garmentType: v })}
                placeholder={t('orders.garmentTypePlaceholder')}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: spacing.sm,
                  marginBottom: 4,
                }}
              >
                <Text variant="label" tone="textMuted">
                  {t('guides.infoTemplateTitle')}
                </Text>
                <InfoDot
                  title={t('guides.infoTemplateTitle')}
                  message={t('guides.infoTemplateBody')}
                />
              </View>
              <Button
                label={g.template ? t('orders.usingTemplate', { name: g.template.name }) : t('orders.chooseTemplate')}
                variant="secondary"
                onPress={async () => {
                  const key = await dialog.pick({
                    title: t('orders.pickTemplate'),
                    selectedKey: g.template?.id ?? '__none__',
                    options: [
                      { key: '__none__', label: t('orders.noTemplateOption') },
                      ...templates.map((tpl) => ({ key: tpl.id, label: tpl.name })),
                    ],
                  });
                  if (!key) return;
                  pickTemplateForGarment(g.id, key === '__none__' ? null : templates.find((tpl) => tpl.id === key) ?? null);
                }}
              />

              {g.template && g.template.fields.length > 0 ? (
                <>
                  <Text variant="bodySm" tone="textMuted" style={styles.section}>
                    {t('orders.measurementsCm')}
                  </Text>
                  {g.template.fields.map((f) => (
                    <Input
                      key={f.key}
                      label={`${f.label}${f.required ? ' *' : ''}`}
                      value={g.values[f.key] ?? ''}
                      onChangeText={(v) => setGarmentField(g.id, f.key, v)}
                      keyboardType="numeric"
                      placeholder={t('orders.measurementPlaceholder')}
                    />
                  ))}
                </>
              ) : null}

              {!g.template ? (
                <FreeMeasurements
                  values={g.values}
                  setValues={(cb) => updateGarment(g.id, { values: cb(g.values) })}
                />
              ) : null}

              <Input
                label={t('orders.quantityLabel')}
                value={g.quantity}
                onChangeText={(v) => updateGarment(g.id, { quantity: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                placeholder="1"
              />
            </Card>
          ))}

          <Button
            label={t('orders.addAnotherGarment')}
            variant="secondary"
            onPress={addGarment}
          />
          <View style={{ height: spacing.md }} />
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
          {orderNotes.trim().length > 0 ? (
            <Pressable onPress={() => setTidyOpen(true)} hitSlop={8} style={styles.tidyBtn}>
              <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
              <Text variant="caption" tone="primary">{t('orders.tidyUp')}</Text>
            </Pressable>
          ) : null}

          <FabricField value={fabricId} onChange={setFabricId} />
          {fabricId ? (
            <Input
              label={t('fabrics.metersUsedLabel')}
              value={fabricYardage}
              onChangeText={setFabricYardage}
              keyboardType="decimal-pad"
              placeholder={t('fabrics.yardagePlaceholder')}
            />
          ) : null}
          <View style={{ height: spacing.sm }} />

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
      <TidyNotesSheet
        visible={tidyOpen}
        onClose={() => setTidyOpen(false)}
        notes={orderNotes}
        onAccept={setOrderNotes}
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
      <Text variant="bodySm" tone="textMuted" style={styles.section}>{t('orders.manualMeasurementsCm')}</Text>
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
  tidyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  garmentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
