import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../lib/auth-context';
import { useMe, useUpsertMyTailor } from '../../lib/queries';
import { clearCache } from '../../lib/query-client';
import { colors, spacing } from '../../lib/theme';

export default function Me() {
  const { signOut } = useAuth();
  const { data: me, isLoading } = useMe();
  const upsert = useUpsertMyTailor();

  const [businessName, setBusinessName] = useState('');
  const [countryCode, setCountryCode] = useState('NG');
  const [currency, setCurrency] = useState('NGN');
  const [location, setLocation] = useState('');

  // Initial state hydrates from /me once it lands.
  useEffect(() => {
    if (me?.tailor) {
      setBusinessName(me.tailor.businessName);
      setCountryCode(me.tailor.countryCode);
      setCurrency(me.tailor.currency);
      setLocation(me.tailor.location ?? '');
    }
  }, [me?.tailor]);

  const save = () => {
    upsert.mutate(
      {
        businessName,
        countryCode: countryCode.toUpperCase(),
        currency: currency.toUpperCase(),
        location: location || null,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Business profile updated');
          router.back();
        },
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const onSignOut = async () => {
    // Clear the cached data for this user before the JWT goes away.
    await clearCache();
    await signOut();
  };

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.label}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.heading}>Business profile</Text>
        {me?.email ? <Text style={styles.email}>Signed in as {me.email}</Text> : null}

        <Input
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g. SeamFlow Studio"
        />
        <Input
          label="Country code (ISO 2)"
          value={countryCode}
          onChangeText={setCountryCode}
          maxLength={2}
          autoCapitalize="characters"
        />
        <Input
          label="Currency (ISO 3)"
          value={currency}
          onChangeText={setCurrency}
          maxLength={3}
          autoCapitalize="characters"
        />
        <Input
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="Lagos, Nigeria"
        />

        <Button
          label="Save"
          onPress={save}
          loading={upsert.isPending}
          disabled={!businessName || countryCode.length !== 2 || currency.length !== 3}
        />

        <View style={{ height: spacing.xl }} />
        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  email: { color: colors.textMuted, marginBottom: spacing.lg },
  label: { color: colors.textMuted },
});
