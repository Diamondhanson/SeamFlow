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
import {
  NO_PENDING,
  numericMeasurements,
  type PendingMeasurement,
} from '../../components/MeasurementsEditor';
import { MeasurementSheet } from '../../components/MeasurementSheet';
import { parseDecimal } from '../../lib/numeric';
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
import { draftKey, useDraft, useUnsavedWarning } from '../../lib/drafts';
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
  /** The attribute/value row being typed but not yet added. Carried here so it
   *  is covered by the draft — it is the most likely thing to be lost. */
  pending: PendingMeasurement;
  /** Label of the saved measurement set the values were pre-filled from —
   *  display-only, drives the "loaded from saved" note. */
  prefilledFrom?: string;
};

/**
 * Everything in this wizard that a tailor typed, in a shape that survives
 * JSON. Only their input is kept — the client list, template list and search
 * box are all refetched, and storing them would age badly.
 *
 * `orderDate` is an ISO string rather than a Date: JSON.stringify turns a Date
 * into a string on the way out and hands back a string on the way in, so
 * pretending otherwise would put a broken `Date` into state on restore.
 */
type WizardDraft = {
  step: Step;
  pickedClient: Client | null;
  pickedContact: PickedContact | null;
  showNewClientForm: boolean;
  newClientName: string;
  newClientPhone: string;
  newClientAddress: string;
  garments: GarmentDraft[];
  orderName: string;
  orderNotes: string;
  orderDate: string | null;
  fabricId: string | null;
  fabricYardage: string;
};

/**
 * Has the tailor actually done anything yet?
 *
 * The wizard boots with one blank garment and an empty form, and offering to
 * restore THAT is worse than offering nothing — it claims work was rescued
 * when there was none. So: a person chosen, a garment described or measured,
 * or any order detail filled in.
 */
function wizardHasContent(d: WizardDraft): boolean {
  if (d.pickedClient || d.pickedContact) return true;
  if (d.newClientName.trim() || d.newClientPhone.trim() || d.newClientAddress.trim()) return true;
  if (d.orderName.trim() || d.orderNotes.trim() || d.orderDate || d.fabricId || d.fabricYardage.trim()) {
    return true;
  }
  return d.garments.some(
    (g) =>
      g.garmentType.trim() ||
      g.template ||
      Object.values(g.values).some((v) => v.trim()) ||
      g.pending?.name.trim() ||
      g.pending?.value.trim(),
  );
}

/**
 * A garment's measurements including the row still in the draft inputs.
 *
 * The editor only moves a row into `values` when "Add attribute" is pressed.
 * At save time that distinction is invisible to the tailor and irrelevant to
 * the order, so anything they typed counts.
 */
function withPending(g: GarmentDraft): Record<string, string> {
  const name = g.pending?.name.trim();
  if (!name) return g.values;
  return { ...g.values, [name]: g.pending.value.trim() };
}

let garmentSeq = 0;
const makeGarment = (): GarmentDraft => ({
  id: `g${garmentSeq++}`,
  template: null,
  garmentType: '',
  values: {},
  quantity: '1',
  pending: NO_PENDING,
});

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
  //
  // "?forClient=<clientId>" arrives from a client's own screen — the tailor has
  // already said who this is for, so step 1 is answered and skipped.
  const { duplicateFrom, forClient } = useLocalSearchParams<{
    duplicateFrom?: string;
    forClient?: string;
  }>();
  const dupOrderQ = useOrder(duplicateFrom ?? '');
  const dupClientQ = useClient(dupOrderQ.data?.clientId ?? '');
  const forClientQ = useClient(forClient ?? '');
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
  const [creatingClient, setCreatingClient] = useState(false);
  const [tidyOpen, setTidyOpen] = useState(false);

  // ---- Unsaved-work rescue -------------------------------------------------
  //
  // This is the screen that lost a real tailor a real client's measurements:
  // she took them, was interrupted before pressing Save, and closed the app.
  // Everything below lives in memory until submitAll() succeeds, so the fix is
  // to mirror it onto the device on every keystroke. See lib/drafts.ts.
  //
  // A duplicated order gets its own draft key so an interrupted "repeat this
  // order" cannot come back offering itself in a blank new order — and its
  // restore prompt is suppressed, because the seeding effect below would fight
  // a restored draft for the same state.
  const draft: WizardDraft = {
    step,
    pickedClient,
    pickedContact,
    showNewClientForm,
    newClientName,
    newClientPhone,
    newClientAddress,
    garments,
    orderName,
    orderNotes,
    orderDate: orderDate ? orderDate.toISOString() : null,
    fabricId,
    fabricYardage,
  };

  // Laptop courtesy only — see useUnsavedWarning. The phone is covered by the
  // per-keystroke saving above, which is the protection that actually matters.
  useUnsavedWarning(wizardHasContent(draft) && !submitting);

  const { clear: clearDraft } = useDraft<WizardDraft>({
    // An order started for a specific client gets its own draft slot, so an
    // interrupted order for Ada cannot come back offering itself while the
    // tailor is starting one for Chidi.
    key: draftKey('new-order', duplicateFrom ?? (forClient ? `client:${forClient}` : 'blank')),
    value: draft,
    hasContent: wizardHasContent,
    skipRestore: !!duplicateFrom,
    describe: (d) => d.pickedClient?.fullName ?? d.pickedContact?.fullName ?? (d.newClientName.trim() || null),
    onRestore: (d) => {
      // Restoring answers the same question the ?forClient seed would, and it
      // knows more. Claim the seed so the two cannot fight over the step.
      seededRef.current = true;
      setStep(d.step);
      setPickedClient(d.pickedClient);
      setPickedContact(d.pickedContact);
      setShowNewClientForm(d.showNewClientForm);
      setNewClientName(d.newClientName);
      setNewClientPhone(d.newClientPhone);
      setNewClientAddress(d.newClientAddress);
      // Keep the id counter ahead of the restored garments so a garment added
      // after restoring cannot collide with one that came back from storage.
      for (const g of d.garments) {
        const n = Number(g.id.replace(/^g/, ''));
        if (Number.isFinite(n) && n >= garmentSeq) garmentSeq = n + 1;
      }
      // `pending` was added after the first drafts were written; a draft from
      // before then has no such field and would crash the editor.
      const restored = d.garments.map((g) => ({ ...g, pending: g.pending ?? NO_PENDING }));
      setGarments(restored.length ? restored : [makeGarment()]);
      setOrderName(d.orderName);
      setOrderNotes(d.orderNotes);
      setOrderDate(d.orderDate ? new Date(d.orderDate) : null);
      setFabricId(d.fabricId);
      setFabricYardage(d.fabricYardage);
    },
  });

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

  // Same idea, one step smaller: started from a client's screen, so only the
  // client is known. Guarded by the same seededRef so a restored draft or a
  // duplicate seed never gets overwritten by this.
  useEffect(() => {
    if (!forClient || duplicateFrom || seededRef.current) return;
    const client = forClientQ.data;
    if (!client) return;
    seededRef.current = true;
    setPickedClient(client);
    setStep('measurements');
  }, [forClient, duplicateFrom, forClientQ.data]);

  // -------- Step 1: pick or create client --------
  /**
   * Create a client from the inline form and move on.
   *
   * THE IN-FLIGHT GUARD IS NOT OPTIONAL. This button had no pending state, so
   * on a slow request it looked completely dead — and a tailor pressing it
   * again did not retry, it created another client. It happened in real use:
   * eight identical rows landed in the database inside one second, and the
   * screen never moved.
   *
   * The ref, not the state, is what makes it correct. Two taps in the same
   * frame both read the old `creatingClient` before React re-renders; a ref
   * flips synchronously, so the second tap is refused. The state exists only
   * to drive the spinner.
   */
  const creatingRef = useRef(false);
  const createClientInline = async () => {
    if (!newClientName || !newClientPhone || !newClientAddress) return;
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreatingClient(true);
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
    } finally {
      creatingRef.current = false;
      setCreatingClient(false);
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
      // Use the client's full name. This used to take only the first word,
      // which mangles any name whose first token is a courtesy title or a
      // family name — "Mme Bambot" became "Mme", identifying nobody.
      const client = pickedName.trim();
      if (base) setOrderName(client ? `${base} — ${client}` : base);
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
        // Include the row still sitting in the draft inputs. A tailor who typed
        // "Chest 94.5" and pressed Save without first pressing "Add attribute"
        // means that measurement; silently dropping it is the same lost-work
        // complaint in a smaller costume.
        const measurements = numericMeasurements(withPending(g));
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
          const measurements = numericMeasurements(withPending(g));
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
        fabricYardageUsed: parseDecimal(fabricYardage),
        items: items.length ? items : undefined,
      });

      // Contact path: the order just materialized the client — save each
      // garment's measurements against the new client id.
      if (!pickedClient) {
        for (const g of garments) {
          const measurements = numericMeasurements(withPending(g));
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

      // Safely on the server now — the local copy has done its job.
      clearDraft();

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
                loading={creatingClient}
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

              {/* Template fields or the free-form editor — the choice lives in
                  <MeasurementSheet> so the group-order screen makes it the
                  same way. Two editors for one concept is how they drift. */}
              <MeasurementSheet
                template={g.template}
                values={g.values}
                setValues={(cb) => updateGarment(g.id, { values: cb(g.values) })}
                pending={g.pending}
                setPending={(pending) => updateGarment(g.id, { pending })}
              />

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
