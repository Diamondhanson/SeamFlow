// ============================================================================
// Turn an enquiry thread into real work (ROADMAP D.2.3 / phase C3).
//
// The bridge between discovery and the order machinery that already exists:
// the server reuses OrdersService and InvoicesService, so a commission born in
// chat flows through exactly the same lifecycle, audit timeline and invoicing
// as one taken at the counter.
//
// The client name field appears only when the enquirer isn't already in the
// tailor's book — asking for a name they've already got would be busywork.
// ============================================================================

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormScroll } from '../../../components/FormScroll';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { DateField } from '../../../components/DateField';
import {
  useConversation,
  useCreateQuoteFromConversation,
} from '../../../lib/queries';
import { useDialog } from '../../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function CreateQuote() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();

  const convoQ = useConversation(id);
  const quote = useCreateQuoteFromConversation(id);
  const conversation = convoQ.data?.conversation;

  const [orderName, setOrderName] = useState('');
  // DateField works in Date; the quote contract wants an ISO date string.
  const [dateDelivery, setDateDelivery] = useState<Date | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Seed sensible defaults from the thread: the design's garment type makes a
  // better order title than an empty box.
  useEffect(() => {
    if (!conversation) return;
    setClientName((prev) => prev || conversation.counterparty.name);
    setOrderName(
      (prev) =>
        prev ||
        (conversation.design?.garmentType
          ? `${conversation.design.garmentType} — ${conversation.counterparty.name}`
          : ''),
    );
  }, [conversation]);

  const submit = () => {
    if (!orderName.trim()) return;
    quote.mutate(
      {
        orderName: orderName.trim(),
        dateDelivery: dateDelivery ? dateDelivery.toISOString().slice(0, 10) : null,
        notes: notes.trim() || null,
        amount: amount.trim() || null,
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || null,
      },
      {
        onSuccess: async (res) => {
          await dialog.alert({
            title: t('chat.quoteCreatedTitle'),
            message: t('chat.quoteCreatedBody'),
            tone: 'success',
          });
          // Straight to the order — the tailor's next action is almost always
          // there, not back in the thread.
          router.replace({ pathname: '/(app)/orders/[id]', params: { id: res.orderId } });
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  if (convoQ.isLoading && !conversation) {
    return (
      <Screen>
        <ScreenHeader title={t('chat.createQuoteTitle')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('chat.createQuoteTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={[styles.intro, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <Text variant="bodySm" tone="textMuted">
            {t('chat.createQuoteBody')}
          </Text>
        </View>

        <Input
          label={t('chat.quoteOrderNameLabel')}
          placeholder={t('chat.quoteOrderNamePlaceholder')}
          value={orderName}
          onChangeText={setOrderName}
        />
        <DateField
          label={t('chat.quoteDeliveryLabel')}
          value={dateDelivery}
          onChange={setDateDelivery}
        />
        <Input
          label={t('chat.quoteAmountLabel')}
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <Input
          label={t('chat.quoteNotesLabel')}
          placeholder={t('chat.quoteNotesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Input
          label={t('chat.quoteClientNameLabel')}
          value={clientName}
          onChangeText={setClientName}
        />
        <Text variant="caption" tone="textMuted" style={styles.help}>
          {t('chat.quoteClientNameHelp')}
        </Text>
        <Input
          label={t('chat.quoteClientPhoneLabel')}
          value={clientPhone}
          onChangeText={setClientPhone}
          keyboardType="phone-pad"
        />

        <View style={styles.submit}>
          <Button
            label={quote.isPending ? t('chat.quoteCreating') : t('chat.quoteSubmit')}
            onPress={submit}
            disabled={quote.isPending || !orderName.trim()}
            loading={quote.isPending}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { padding: spacing.md, marginBottom: spacing.lg },
  help: { marginTop: -spacing.xs, marginBottom: spacing.md },
  submit: { marginTop: spacing.lg },
});
