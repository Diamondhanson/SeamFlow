import { useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
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

  const canSubmit = !!fullName.trim() && !!phone.trim() && !!address.trim();

  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
      {
        onSuccess: async (c) => {
          // One-time reassurance the first time a client is saved.
          if (!isDismissed('success.firstClient')) {
            dismiss('success.firstClient');
            await dialog.alert({
              title: t('guides.firstClientTitle'),
              message: t('guides.firstClientBody'),
              tone: 'success',
            });
          }
          router.dismiss();
          router.push(`/(app)/clients/${c.id}`);
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('clients.newClientTitle')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
          disabled={!canSubmit}
        />
      </ScrollView>
    </Screen>
  );
}
