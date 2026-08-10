import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { CountryCode } from 'libphonenumber-js';
import type {
  Client,
  MeasurementSet,
  MeasurementTemplate,
  MeasurementValues,
} from '@seamflow/schemas';
import { Chip, Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { FormScroll } from '../../components/FormScroll';
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
import { useDialog } from '../../lib/dialog';
import { useGuides } from '../../lib/guides';
import { useTranslation } from '../../lib/i18n';
import { canPickContacts } from '../../lib/platform-capabilities';
import { QUICK_MEASUREMENT_KEYS } from '../../lib/measurements';

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
  /** Label of the saved measurement set the values were pre-filled from —
   *  display-only, drives the "loaded from saved" note. */
  prefilledFrom?: string;
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
  // The picked client's saved measurement sets — so a returning client's
  // numbers are reused instead of retyped. Newest first.
  const [clientSets, setClientSets] = useState<MeasurementSet[]>([]);

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

  // Load the picked client's saved measurements as soon as they're chosen —
  // best-effort: if it fails, the flow just behaves like a new client.
  useEffect(() => {
    let cancelled = false;
    setClientSets([]);
    if (!pickedClient) return;
    void api.measurementSets
      .listForClient(pickedClient.id)
      .then((res) => {
        if (cancelled) return;
        const sorted = [...res.items].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setClientSets(sorted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pickedClient]);

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

  /** The saved set that best matches a template: prefer one created from this
   *  exact template, else the newest set sharing at least one field key. */
  const bestSetForTemplate = (tpl: MeasurementTemplate): MeasurementSet | null => {
    const exact = clientSets.find((s) => s.templateId === tpl.id);
    if (exact) return exact;
    return (
      clientSets.find((s) =>
        tpl.fields.some((f) => s.values[f.key] !== undefined),
      ) ?? null
    );
  };

  const pickTemplateForGarment = (id: string, tpl: MeasurementTemplate | null) =>
    setGarments((gs) =>
      gs.map((g) => {
        if (g.id !== id) return g;
        const seeded: Record<string, string> = {};
        // Returning client: their saved numbers pre-fill the matching fields
        // so nothing gets retyped — still fully editable before submitting.
        const saved = tpl ? bestSetForTemplate(tpl) : null;
        if (tpl) {
          for (const f of tpl.fields) {
            const v = saved?.values[f.key];
            seeded[f.key] = v !== undefined ? String(v) : '';
          }
        }
        return {
          ...g,
          template: tpl,
          values: seeded,
          prefilledFrom: saved ? saved.label : undefined,
          // Adopt the template's garment type, but never clobber a name the
          // tailor already typed.
          garmentType: g.garmentType || (tpl?.garmentType ?? ''),
        };
      }),
    );

  /** Manual path: pick one of the client's saved sets and load its values —
   *  into the template's fields when one is chosen, else as free entries. */
  const fillFromSavedSet = async (id: string) => {
    const g = garments.find((x) => x.id === id);
    if (!g || clientSets.length === 0) return;
    const key = await dialog.pick({
      title: t('orders.pickSavedSet'),
      options: clientSets.map((s) => ({
        key: s.id,
        label: t('orders.savedSetOption', {
          label: s.label,
          count: Object.keys(s.values).length,
        }),
      })),
    });
    if (!key) return;
    const set = clientSets.find((s) => s.id === key);
    if (!set) return;
    setGarments((gs) =>
      gs.map((x) => {
        if (x.id !== id) return x;
        const values: Record<string, string> = {};
        if (x.template) {
          for (const f of x.template.fields) {
            const v = set.values[f.key];
            values[f.key] = v !== undefined ? String(v) : (x.values[f.key] ?? '');
          }
        } else {
          for (const [k, v] of Object.entries(set.values)) values[k] = String(v);
        }
        return { ...x, values, prefilledFrom: set.label };
      }),
    );
  };

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
      // No per-field measurement check here, deliberately.
      //
      // Every measurement is optional, including the ones a template marks
      // "required". A tailor half-way through taking measurements should be
      // able to save and come back, and a garment that genuinely doesn't need
      // a field shouldn't be blocked by a template written for a different
      // one. Templates suggest a sheet; they don't gate it.
    }
    // Kill the "name it twice" confusion: suggest the order's title from the
    // garments + client so the tailor usually just confirms it. Never
    // overwrites a title they already typed (or a duplicated order's name).
    if (!orderName.trim()) {
      const types = [...new Set(garments.map((g) => g.garmentType.trim()).filter(Boolean))];
      const base = types
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' + ');
      const firstName = pickedName.trim().split(/\s+/)[0] ?? '';
      if (base) setOrderName(firstName ? `${base} — ${firstName}` : base);
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
        <FormScroll showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
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
          {/* No address-book API in a browser — manual entry only there. */}
          {canPickContacts ? (
            <>
              <Button
                label={t('orders.selectFromContacts')}
                variant="secondary"
                onPress={() => setContactsOpen(true)}
              />
              <View style={{ height: spacing.sm }} />
            </>
          ) : null}
          <Button
            label={t('orders.newClient')}
            variant="secondary"
            onPress={() => setShowNewClientForm(true)}
          />

          {showNewClientForm ? (
            <>
              {/* Card has padding but no margin, so without this the form
                  butts straight into the button that opened it. */}
              <View style={{ height: spacing.md }} />
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
            </>
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
        </FormScroll>
      ) : null}

      {step === 'measurements' && hasPicked ? (
        <FormScroll showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
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

              {clientSets.length > 0 ? (
                <>
                  <View style={{ height: spacing.sm }} />
                  <Button
                    label={t('orders.useSavedMeasurements')}
                    variant="ghost"
                    size="sm"
                    onPress={() => void fillFromSavedSet(g.id)}
                  />
                </>
              ) : null}

              {g.prefilledFrom ? (
                <Text variant="caption" tone="success" style={styles.prefilledNote}>
                  {t('orders.prefilledFrom', { label: g.prefilledFrom })}
                </Text>
              ) : null}

              {g.template && g.template.fields.length > 0 ? (
                <>
                  <Text variant="bodySm" tone="textMuted" style={styles.section}>
                    {t('orders.measurementsCm')}
                  </Text>
                  {g.template.fields.map((f) => (
                    <Input
                      key={f.key}
                      // No asterisk: nothing here is required any more, and a
                      // marker that doesn't gate anything just misleads.
                      label={f.label}
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
        </FormScroll>
      ) : null}

      {step === 'order' && hasPicked ? (
        <FormScroll showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
          <Text variant="body" tone="textMuted" style={styles.context}>
            <Text variant="body" tone="text" style={styles.contextStrong}>{t('orders.clientLabel', { name: pickedName })}</Text>
          </Text>

          <Input
            label={t('orders.orderNameLabel')}
            value={orderName}
            onChangeText={setOrderName}
            placeholder={t('orders.orderNamePlaceholder')}
          />
          <Text variant="caption" tone="textMuted" style={styles.nameHelp}>
            {t('orders.orderNameHelp')}
          </Text>
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
        </FormScroll>
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

/**
 * Manual measurements, when no template is chosen.
 *
 * Two earlier attempts got this wrong in the same way: the value field only
 * existed AFTER you had committed a name, so the first thing a tailor saw was
 * one lone box with no clue what came next. The original required a hidden
 * keyboard Enter to advance; the second added a button but still hid the value.
 *
 * Now the draft row shows BOTH inputs from the start — attribute and value,
 * side by side — with an "Add attribute" button under them. Nothing is hidden
 * and nothing depends on a keystroke you have to guess.
 *
 * The chips underneath stay as an accelerator: one tap fills the attribute for
 * the measurements almost every order needs.
 */
function FreeMeasurements({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: (cb: (cur: Record<string, string>) => Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [draftName, setDraftName] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const valueRef = useRef<TextInput>(null);

  const commit = () => {
    const key = draftName.trim();
    if (!key) return;
    setValues((cur) => ({ ...cur, [key]: draftValue.trim() }));
    setDraftName('');
    setDraftValue('');
  };

  const remove = (key: string) =>
    setValues((cur) => {
      const next = { ...cur };
      delete next[key];
      return next;
    });

  const entries = Object.entries(values);

  return (
    <View>
      <Text variant="label" tone="textMuted" style={styles.section}>
        {t('orders.manualMeasurementsCm')}
      </Text>
      <Text variant="bodySm" tone="textMuted" style={styles.measureHint}>
        {t('orders.manualMeasurementsHint')}
      </Text>

      {/* Already added — still editable, with a way back out. */}
      {entries.map(([k, v]) => (
        <View key={k} style={styles.measureRow}>
          <View style={styles.measureName}>
            <Input
              label={t('orders.attributeLabel')}
              value={k}
              editable={false}
            />
          </View>
          <View style={styles.measureValue}>
            <Input
              label={t('orders.valueLabel')}
              value={v}
              onChangeText={(val) => setValues((cur) => ({ ...cur, [k]: val }))}
              keyboardType="numeric"
            />
          </View>
          <Pressable
            onPress={() => remove(k)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('orders.removeMeasurement', { name: k })}
            style={styles.measureRemove}
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      {/* The draft row. Both boxes visible before you type anything. */}
      <View style={styles.measureRow}>
        <View style={styles.measureName}>
          <Input
            label={t('orders.attributeLabel')}
            value={draftName}
            onChangeText={setDraftName}
            autoCapitalize="words"
            placeholder={t('orders.attributePlaceholder')}
            returnKeyType="next"
            onSubmitEditing={() => valueRef.current?.focus()}
          />
        </View>
        <View style={styles.measureValue}>
          <Input
            ref={valueRef}
            label={t('orders.valueLabel')}
            value={draftValue}
            onChangeText={setDraftValue}
            keyboardType="numeric"
            placeholder={t('orders.measurementValuePlaceholder')}
            returnKeyType="done"
            onSubmitEditing={commit}
          />
        </View>
        {/* Spacer keeps the draft row's inputs aligned with the rows above,
            which each carry a remove button in this column. */}
        {entries.length > 0 ? <View style={styles.measureRemoveSpacer} /> : null}
      </View>

      <Button
        label={t('orders.addAttribute')}
        variant="secondary"
        onPress={commit}
        disabled={!draftName.trim()}
      />

      {/* One tap fills the attribute for the usual suspects. */}
      <Text variant="bodySm" tone="textMuted" style={styles.measureQuickHint}>
        {t('orders.quickAddMeasurements')}
      </Text>
      <View style={styles.measureChips}>
        {QUICK_MEASUREMENT_KEYS.map((mkey) => {
          const name = t(`measurements.${mkey}`);
          const added = name in values;
          return (
            <Chip
              key={mkey}
              label={added ? `✓ ${name}` : `+ ${name}`}
              tone={added ? 'success' : 'primary'}
              onPress={() => {
                if (added) return remove(name);
                // Fill the draft rather than committing blind, so the tailor
                // lands on the value box with the attribute already set.
                setDraftName(name);
                valueRef.current?.focus();
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prefilledNote: { marginTop: spacing.sm },
  nameHelp: { marginTop: 4, marginBottom: spacing.sm },
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
  measureHint: { marginBottom: spacing.sm },
  measureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  measureName: { flex: 3 },
  measureValue: { flex: 2 },
  measureRemoveSpacer: { width: 22 },
  measureQuickHint: { marginTop: spacing.md, marginBottom: spacing.sm },
  // Nudged down so the icon sits against the field, not its floating label.
  measureRemove: { paddingTop: 18 },
  // marginBottom, or the last chip row sits flush against the Quantity field
  // below it — the same missing-gap problem as the fabric card.
  measureChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
