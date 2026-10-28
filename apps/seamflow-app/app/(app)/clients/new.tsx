import { useState } from 'react';
import { useSubmitOnce } from '../../../lib/use-submit-once';
import { ScrollView } from '../../../components/EdgeScroll';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { PhoneInput } from '../../../components/PhoneInput';
import { Button } from '../../../components/Button';
import { useCreateClient } from '../../../lib/queries';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';
import { useGuides } from '../../../lib/guides';

// New-client form is intentionally minimal: name, phone, address. The edit
// screen (`clients/[id].tsx`) is where additional fields like email and
// notes can be filled in later — keeps the new-client flow fast at the
// point a tailor is taking a customer's info on a busy day.
export default function NewClient() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { isDismissed, dismiss } = useGuides();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const create = useCreateClient();
  const begin = useSubmitOnce();

  const canSubmit = !!fullName.trim() && !!phone.trim() && !!address.trim();

  const submit = () => {
    if (!canSubmit) return;
    // One press, one client. The first save used to leave the screen looking
    // unchanged for a moment, and a second press made a second client.
    const release = begin();
    if (!release) return;
    create.mutate(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
      {
        onSuccess: (c) => {
          // Leave first, explain afterwards. This used to await the one-time
          // "first client" dialog BEFORE leaving, and a dialog that does not
          // appear above a modal screen left the form open — looking unsaved —
          // while the client had in fact been created.
          router.dismiss();
          router.push(`/(app)/clients/${c.id}`);
          if (!isDismissed('success.firstClient')) {
            dismiss('success.firstClient');
            setTimeout(() => {
              void dialog.alert({
                title: t('guides.firstClientTitle'),
                message: t('guides.firstClientBody'),
                tone: 'success',
              });
            }, 500);
          }
        },
        onError: (err) => {
          release();
          void dialog.error(err);
        },
      },
    );
  };

  return (
    <Screen bleed>
      <ScreenHeader title={t('clients.newClientTitle')} />
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
          label={t('clients.addressLabel')}
          value={address}
          onChangeText={setAddress}
          placeholder={t('clients.addressPlaceholder')}
          multiline
        />
        <Button
          label={t('clients.createClient')}
          onPress={submit}
          loading={create.isPending}
          disabled={!canSubmit || create.isPending}
        />
      </FormScroll>
    </Screen>
  );
}
