import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { Input } from '../../../components/Input';
import { DateField } from '../../../components/DateField';
import { Button } from '../../../components/Button';
import { useCreateGroupOrder } from '../../../lib/queries';
import { colors, spacing } from '../../../lib/theme';

export default function NewGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharedDesignNotes, setSharedDesignNotes] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [dateDelivery, setDateDelivery] = useState<Date | null>(null);
  const create = useCreateGroupOrder();

  const submit = () => {
    create.mutate(
      {
        name,
        description: description || null,
        sharedDesignNotes: sharedDesignNotes || null,
        eventDate: eventDate ? eventDate.toISOString() : null,
        dateDelivery: dateDelivery ? dateDelivery.toISOString() : null,
      },
      {
        onSuccess: (g) => {
          router.dismiss();
          router.push(`/(app)/groups/${g.id}`);
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
          label="Title *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Hanson's Wedding Bridesmaids"
        />
        <Input
          label="Description / other style specs"
          value={description}
          onChangeText={setDescription}
          placeholder="optional"
          multiline
        />
        <Input
          label="Shared design / pattern notes"
          value={sharedDesignNotes}
          onChangeText={setSharedDesignNotes}
          placeholder="The pattern everyone follows"
          multiline
        />
        <DateField label="Event date" value={eventDate} onChange={setEventDate} />
        <DateField
          label="Delivery date"
          value={dateDelivery}
          onChange={setDateDelivery}
        />
        <Text style={styles.note}>
          Add members and pick the owner (bride / groom / etc.) after creating the group.
        </Text>
        <Button
          label="Create group order"
          onPress={submit}
          loading={create.isPending}
          disabled={!name}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
});
