import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { useCreateClient } from '../../../lib/queries';

export default function NewClient() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateClient();

  const submit = () => {
    create.mutate(
      {
        fullName,
        phone,
        email: email || null,
        notes: notes || null,
      },
      {
        onSuccess: (c) => {
          router.dismiss();
          router.push(`/(app)/clients/${c.id}`);
        },
        onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    <Screen>
      <ScrollView>
        <Input label="Full name *" value={fullName} onChangeText={setFullName} placeholder="Adaeze Okeke" />
        <Input
          label="Phone *"
          value={phone}
          onChangeText={setPhone}
          placeholder="+234..."
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="optional"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Preferences, etc."
          multiline
        />
        <Button
          label="Create client"
          onPress={submit}
          loading={create.isPending}
          disabled={!fullName || !phone}
        />
      </ScrollView>
    </Screen>
  );
}
