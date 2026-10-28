// ============================================================================
// Edit an order — name, delivery date, notes.
//
// The order screen could change an order's status, photos and measurements but
// not the order itself: a wrong title or a delivery date that moved had no
// remedy but deleting the order and starting again. The server has always
// accepted these edits; only this screen was missing.
//
// Status stays where it was (the order screen's status section) because a status
// change is an EVENT with a history and a notification to the customer, not a
// field to overwrite.
// ============================================================================

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonForm } from '../../../components/Skeleton';
import { LoadFailed } from '../../../components/LoadFailed';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { DateField } from '../../../components/DateField';
import { useOrder, useUpdateOrder } from '../../../lib/queries';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { useSubmitOnce } from '../../../lib/use-submit-once';
import { haptics } from '../../../lib/haptics';

export default function EditOrder() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderQ = useOrder(id ?? '');
  const update = useUpdateOrder(id ?? '');
  const begin = useSubmitOnce();

  const [orderName, setOrderName] = useState('');
  const [delivery, setDelivery] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  // Fill ONCE from the saved order, so a background refetch never overwrites
  // what is being typed.
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const o = orderQ.data;
    if (!o || filled) return;
    setOrderName(o.orderName ?? '');
    setDelivery(o.dateDelivery ? new Date(o.dateDelivery) : null);
    setNotes(o.notes ?? '');
    setFilled(true);
  }, [orderQ.data, filled]);

  const canSubmit = !!orderName.trim();

  const submit = () => {
    if (!canSubmit || !id) return;
    const release = begin();
    if (!release) return;
    update.mutate(
      {
        orderName: orderName.trim(),
        dateDelivery: delivery ? delivery.toISOString() : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          haptics.success();
          router.back();
        },
        onError: (err) => {
          release();
          void dialog.error(err);
        },
      },
    );
  };

  if (orderQ.isError && !orderQ.data) {
    return (
      <Screen>
        <ScreenHeader title={t('orders.editOrderTitle')} />
        <LoadFailed onRetry={() => void orderQ.refetch()} />
      </Screen>
    );
  }

  if (!filled) {
    return (
      <Screen bleed>
        <ScreenHeader title={t('orders.editOrderTitle')} />
        <SkeletonForm fields={3} />
      </Screen>
    );
  }

  return (
    <Screen bleed>
      <ScreenHeader title={t('orders.editOrderTitle')} />
      <FormScroll
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Input label={t('orders.orderNameLabel')} value={orderName} onChangeText={setOrderName} />
        <DateField label={t('orders.deliveryDate')} value={delivery} onChange={setDelivery} />
        <Input label={t('orders.notesLabel')} value={notes} onChangeText={setNotes} multiline />
        <Button
          label={t('orders.saveChanges')}
          onPress={submit}
          loading={update.isPending}
          disabled={!canSubmit || update.isPending}
        />
      </FormScroll>
    </Screen>
  );
}
