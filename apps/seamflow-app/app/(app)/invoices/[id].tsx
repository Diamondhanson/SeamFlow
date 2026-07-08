import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { formatCurrency } from '@seamflow/utils';
import type { InvoiceLineCategory, InvoiceLineItem } from '@seamflow/schemas';
import { Screen } from '../../../components/Screen';
import { SkeletonForm } from '../../../components/Skeleton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import {
  useClient,
  useCreateInvoiceForOrder,
  useDeleteInvoice,
  useFabrics,
  useInvoice,
  useMe,
  useOrder,
  useUpdateInvoice,
} from '../../../lib/queries';
import { useShareInvoice } from '../../../lib/share-invoice';
import {
  buildInvoiceHtml,
  shareInvoicePdf,
  type InvoicePdfLabels,
} from '../../../lib/invoice-pdf';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

// Local, editable line (numbers kept as strings for smooth text editing).
interface EditLine {
  id: string;
  category: InvoiceLineCategory;
  description: string;
  qty: string;
  price: string;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const toEdit = (l: InvoiceLineItem): EditLine => ({
  id: l.id,
  category: l.category,
  description: l.description,
  qty: String(l.quantity),
  price: String(l.unitPrice),
});
const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function InvoiceEditor() {
  // Two entry modes: an existing invoice (`id` is the invoice id) or a fresh
  // one for an order (`orderId` set — we create-or-open it here so the tap on
  // the list navigates instantly instead of waiting on the create round-trip).
  const { id, orderId } = useLocalSearchParams<{ id: string; orderId?: string }>();
  const { t } = useTranslation();
  const { colors: atelier } = useAtelierTheme();
  const colors = useThemeColors();
  const scroll = useFloatingScroll();
  const dialog = useDialog();

  const createM = useCreateInvoiceForOrder();
  const [createdId, setCreatedId] = useState<string | null>(null);
  // The invoice id this screen actually edits.
  const invoiceId = orderId ? createdId ?? '' : id;

  useEffect(() => {
    if (!orderId || createdId || createM.isPending) return;
    createM.mutate(orderId, {
      onSuccess: (inv) => setCreatedId(inv.id),
      onError: (err) => {
        void dialog.error(err);
        router.back();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, createdId]);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateM = useUpdateInvoice(invoiceId);
  const deleteM = useDeleteInvoice(invoiceId);
  const share = useShareInvoice(invoiceId);
  const { data: me } = useMe();
  // Resolve the client's phone for the WhatsApp option (best-effort).
  const orderQ = useOrder(invoice?.orderId ?? '');
  const clientQ = useClient(orderQ.data?.clientId ?? '');
  const fabricsQ = useFabrics();

  // The order's attached fabric — used to pre-fill a manually-added Fabric line.
  const orderFabric = useMemo(() => {
    const fid = orderQ.data?.fabricId;
    if (!fid) return null;
    return fabricsQ.data?.items.find((f) => f.id === fid) ?? null;
  }, [orderQ.data?.fabricId, fabricsQ.data]);

  const [lines, setLines] = useState<EditLine[]>([]);
  const [deposit, setDeposit] = useState('0');
  const [notes, setNotes] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setLines(invoice.lineItems.map(toEdit));
    setDeposit(String(invoice.deposit));
    setNotes(invoice.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.updatedAt]);

  const currency = invoice?.currency ?? null;
  const money = (amt: number) => (currency ? formatCurrency(amt, currency) : String(amt));

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Math.max(0, Math.round(num(l.qty))) * num(l.price), 0),
    [lines],
  );
  const balance = subtotal - num(deposit);

  const setLine = (lid: string, patch: Partial<EditLine>) =>
    setLines((ls) => ls.map((l) => (l.id === lid ? { ...l, ...patch } : l)));
  const removeLine = (lid: string) => setLines((ls) => ls.filter((l) => l.id !== lid));
  const addLine = (category: InvoiceLineCategory) =>
    setLines((ls) => {
      // A Fabric line pre-fills from the order's attached fabric: description
      // from its name/colour, price from cost/m × meters used (folded into the
      // unit price since quantity is a whole number). Editable afterwards.
      if (category === 'fabric' && orderFabric) {
        const yards = orderQ.data?.fabricYardageUsed
          ? Number(orderQ.data.fabricYardageUsed)
          : null;
        const cost = orderFabric.costPerMeter != null ? Number(orderFabric.costPerMeter) : 0;
        const price = yards && yards > 0 ? Math.round(cost * yards * 100) / 100 : cost;
        const description = [orderFabric.name, orderFabric.color ? `— ${orderFabric.color}` : '']
          .filter(Boolean)
          .join(' ');
        return [...ls, { id: uid(), category, description, qty: '1', price: String(price) }];
      }
      return [...ls, { id: uid(), category, description: '', qty: '1', price: '0' }];
    });

  const buildPayload = () => ({
    lineItems: lines.map((l) => ({
      id: l.id,
      category: l.category,
      description: l.description,
      quantity: Math.max(1, Math.round(num(l.qty)) || 1),
      unitPrice: Math.max(0, num(l.price)),
    })),
    deposit: Math.max(0, num(deposit)),
    notes: notes.trim() ? notes : null,
  });

  const save = async () => {
    try {
      await updateM.mutateAsync(buildPayload());
    } catch (err) {
      await dialog.error(err);
    }
  };

  const send = async () => {
    // Persist the latest edits, then hand the link to the client.
    try {
      await updateM.mutateAsync(buildPayload());
    } catch (err) {
      await dialog.error(err);
      return;
    }
    void share.share({
      invoiceNumber: invoice?.number ?? '',
      clientName: invoice?.clientName ?? null,
      clientPhone: clientQ.data?.phone ?? null,
      tailorBusinessName: me?.tailor?.businessName ?? null,
    });
  };

  const onSharePdf = async () => {
    if (!invoice) return;
    setPdfBusy(true);
    try {
      const payload = buildPayload();
      // Persist the current edits so the stored invoice matches the PDF.
      await updateM.mutateAsync(payload);
      const labels: InvoicePdfLabels = {
        invoice: t('invoices.detailTitle'),
        billedTo: t('invoices.pdfBilledTo'),
        subtotal: t('invoices.subtotal'),
        deposit: t('invoices.pdfDeposit'),
        balanceDue: t('invoices.balanceDue'),
        notes: t('invoices.notesLabel'),
        sentBy: t('invoices.pdfSentBy'),
        category: {
          garment: t('invoices.category_garment'),
          workmanship: t('invoices.category_workmanship'),
          fabric: t('invoices.category_fabric'),
          extra: t('invoices.category_extra'),
          custom: t('invoices.category_custom'),
        },
      };
      const html = buildInvoiceHtml(
        {
          number: invoice.number,
          dateIso: invoice.issuedAt ?? invoice.createdAt,
          clientName: invoice.clientName ?? null,
          tailorName: me?.tailor?.businessName ?? 'SeamFlow',
          tailorLocation: me?.tailor?.location ?? null,
          currency,
          lines: payload.lineItems,
          deposit: payload.deposit,
          notes: payload.notes,
        },
        labels,
      );
      await shareInvoicePdf(html, `${invoice.number}.pdf`);
    } catch (err) {
      await dialog.error(err, { title: t('invoices.pdfCouldNotShare') });
    } finally {
      setPdfBusy(false);
    }
  };

  const onDelete = async () => {
    const ok = await dialog.confirm({
      title: t('invoices.deleteConfirmTitle'),
      message: t('invoices.deleteConfirmBody', { number: invoice?.number ?? '' }),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    deleteM.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: (err) => void dialog.error(err),
    });
  };

  if (isLoading || !invoice) {
    return (
      <Screen>
        <ScreenHeader title={t('invoices.detailTitle')} />
        <SkeletonForm fields={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={invoice.number}
        subtitle={`${t(`invoices.status_${invoice.status}`)} · ${invoice.clientName ?? ''}`}
      />
      <ScrollView
        {...scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <Text variant="h3" style={styles.section}>{t('invoices.lineItems')}</Text>

        {lines.length === 0 ? (
          <Text variant="bodySm" tone="textMuted" style={{ marginBottom: spacing.md }}>
            {t('invoices.noLines')}
          </Text>
        ) : (
          lines.map((l) => (
            <Card key={l.id}>
              <View style={styles.lineHead}>
                <Text variant="label" tone="textMuted">
                  {t(`invoices.category_${l.category}`)}
                </Text>
                <Button
                  label={t('common.remove')}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => removeLine(l.id)}
                />
              </View>
              <Input
                label={t('invoices.descriptionPlaceholder')}
                value={l.description}
                onChangeText={(v) => setLine(l.id, { description: v })}
                placeholder={t('invoices.descriptionPlaceholder')}
              />
              <View style={styles.qtyRow}>
                <View style={styles.qtyCol}>
                  <Input
                    label={t('invoices.qtyLabel')}
                    value={l.qty}
                    onChangeText={(v) => setLine(l.id, { qty: v })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.priceCol}>
                  <Input
                    label={`${t('invoices.priceLabel')}${currency ? ` (${currency})` : ''}`}
                    value={l.price}
                    onChangeText={(v) => setLine(l.id, { price: v })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text variant="bodySm" tone="textMuted" style={styles.lineTotal}>
                {money(Math.max(0, Math.round(num(l.qty))) * num(l.price))}
              </Text>
            </Card>
          ))
        )}

        {/* Quick-add categories */}
        <View style={styles.addRow}>
          <Button label={t('invoices.addWorkmanship')} variant="secondary" fullWidth={false} onPress={() => addLine('workmanship')} />
          <Button label={t('invoices.addFabric')} variant="secondary" fullWidth={false} onPress={() => addLine('fabric')} />
          <Button label={t('invoices.addExtra')} variant="secondary" fullWidth={false} onPress={() => addLine('extra')} />
          <Button label={t('invoices.addCustom')} variant="secondary" fullWidth={false} onPress={() => addLine('custom')} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text variant="body" tone="textMuted">{t('invoices.subtotal')}</Text>
          <Text variant="body" numeric>{money(subtotal)}</Text>
        </View>
        <Input
          label={t('invoices.depositLabel')}
          value={deposit}
          onChangeText={setDeposit}
          keyboardType="decimal-pad"
        />
        <View style={styles.totalRow}>
          <Text variant="h3">{t('invoices.balanceDue')}</Text>
          <Text variant="h3" style={{ color: atelier.primary }} numeric>{money(balance)}</Text>
        </View>

        <View style={{ height: spacing.md }} />
        <Input
          label={t('invoices.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('invoices.notesPlaceholder')}
          multiline
        />

        <View style={{ height: spacing.lg }} />
        <Button label={t('common.save')} variant="secondary" onPress={save} loading={updateM.isPending} />
        <View style={{ height: spacing.sm }} />
        <Button
          label={share.isPending ? t('invoices.sending') : t('invoices.send')}
          onPress={send}
          loading={share.isPending}
          iconLeft={share.isPending ? undefined : <Ionicons name="share-social-outline" size={18} color={colors.accentText} />}
        />
        <View style={{ height: spacing.sm }} />
        <Button
          label={pdfBusy ? t('invoices.preparingPdf') : t('invoices.sharePdf')}
          variant="secondary"
          onPress={onSharePdf}
          loading={pdfBusy}
          iconLeft={pdfBusy ? undefined : <Ionicons name="document-text-outline" size={18} color={colors.text} />}
        />

        <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        <Button label={t('invoices.deleteInvoice')} variant="danger" onPress={onDelete} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm, marginBottom: spacing.sm },
  lineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  qtyRow: { flexDirection: 'row', gap: spacing.sm },
  qtyCol: { width: 100 },
  priceCol: { flex: 1 },
  lineTotal: { textAlign: 'right', marginTop: 2 },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  divider: { height: 1, marginVertical: spacing.lg },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
