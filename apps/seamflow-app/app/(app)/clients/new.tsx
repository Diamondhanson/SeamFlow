import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Input } from '../../../components/Input';
import { PhoneInput } from '../../../components/PhoneInput';
import { Button } from '../../../components/Button';
import { useCreateClient } from '../../../lib/queries';
import { useTranslation } from '../../../lib/i18n';

// New-client form is intentionally minimal: name, phone, address. The edit
// screen (`clients/[id].tsx`) is where additional fields like email and
// notes can be filled in later — keeps the new-client flow fast at the
// point a tailor is taking a customer's info on a busy day.
export default function NewClient() {
  const { t } = useTranslation();
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
        onSuccess: (c) => {
          router.dismiss();
          router.push(`/(app)/clients/${c.id}`);
        },
        onError: (err) =>
          Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title={t('clients.newClientTitle')} />
      <ScrollView showsVerticalScrollIndicator={false}>
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
