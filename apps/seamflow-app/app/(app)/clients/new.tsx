import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useCreateClient } from '../../../lib/queries';

// New-client form is intentionally minimal: name, phone, address. The edit
// screen (`clients/[id].tsx`) is where additional fields like email and
// notes can be filled in later — keeps the new-client flow fast at the
// point a tailor is taking a customer's info on a busy day.
export default function NewClient() {
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
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    <Screen>
      <ScrollView>
        <Input
          label="Full name *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Adaeze Okeke"
        />
        <Input
          label="Phone *"
          value={phone}
          onChangeText={setPhone}
          placeholder="+237 6XX XX XX XX"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <Input
          label="Address *"
          value={address}
          onChangeText={setAddress}
          placeholder="Bonanjo, Douala"
          multiline
        />
        <Button
          label="Create client"
          onPress={submit}
          loading={create.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
    </Screen>
  );
}
