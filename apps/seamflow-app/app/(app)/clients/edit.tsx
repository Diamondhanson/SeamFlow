// ============================================================================
// Edit a client — the screen the client page's pencil opens.
//
// The new-client form is deliberately short (name, phone, address) so taking a
// customer's details on a busy day stays quick; this is where the rest — email,
// notes — and any correction to the first three live. Until it existed a typo in
// a phone number could not be fixed at all.
// ============================================================================

import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonForm } from '../../../components/Skeleton';
import { Input } from '../../../components/Input';
import { PhoneInput } from '../../../components/PhoneInput';
import { Button } from '../../../components/Button';
import { LoadFailed } from '../../../components/LoadFailed';
import { useClient, useUpdateClient } from '../../../lib/queries';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { useSubmitOnce } from '../../../lib/use-submit-once';
import { haptics } from '../../../lib/haptics';

export default function EditClient() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientQ = useClient(id ?? '');
  const update = useUpdateClient(id ?? '');
  const begin = useSubmitOnce();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  // Fill the form ONCE from the saved client. Re-filling on every refetch would
  // overwrite what the tailor is in the middle of typing.
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const c = clientQ.data;
    if (!c || filled) return;
    setFullName(c.fullName ?? '');
    setPhone(c.phone ?? '');
    setEmail(c.email ?? '');
    setAddress(c.address ?? '');
    setNotes(c.notes ?? '');
    setFilled(true);
  }, [clientQ.data, filled]);

  const canSubmit = !!fullName.trim() && !!phone.trim() && !!address.trim();

  const submit = () => {
    if (!canSubmit || !id) return;
    const release = begin();
    if (!release) return;
    update.mutate(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        // An emptied field clears the saved value rather than being ignored.
        email: email.trim() || null,
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

  if (clientQ.isError && !clientQ.data) {
    return (
      <Screen>
        <ScreenHeader title={t('clients.editClientTitle')} />
        <LoadFailed onRetry={() => void clientQ.refetch()} />
      </Screen>
    );
  }

  if (!filled) {
    return (
      <Screen bleed>
        <ScreenHeader title={t('clients.editClientTitle')} />
        <SkeletonForm fields={5} />
      </Screen>
    );
  }

  return (
    <Screen bleed>
      <ScreenHeader title={t('clients.editClientTitle')} />
      <FormScroll
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Input
          label={t('clients.fullNameLabel')}
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('clients.fullNamePlaceholder')}
        />
        <PhoneInput label={t('clients.phoneLabel')} value={phone} onChangeText={setPhone} />
        <Input
          label={t('clients.emailLabel')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          label={t('clients.addressLabel')}
          value={address}
          onChangeText={setAddress}
          placeholder={t('clients.addressPlaceholder')}
          multiline
        />
        <Input label={t('clients.notesLabel')} value={notes} onChangeText={setNotes} multiline />
        <Button
          label={t('clients.saveChanges')}
          onPress={submit}
          loading={update.isPending}
          disabled={!canSubmit || update.isPending}
        />
      </FormScroll>
    </Screen>
  );
}
