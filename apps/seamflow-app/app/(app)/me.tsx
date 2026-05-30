import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../lib/auth-context';
import { useMe, useUpsertMyTailor } from '../../lib/queries';
import { clearCache } from '../../lib/query-client';
import { ensurePushRegistered, sendPushTest } from '../../lib/notifications';
import { radii, spacing, useThemeColors } from '../../lib/theme';
import { useThemeMode, type ThemePreference } from '../../lib/theme-mode';

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

  const onTestNotification = async () => {
    try {
      // Make sure we have a token registered before firing — without this
      // the server has nothing to push to.
      const token = await ensurePushRegistered();
      if (!token) {
        Alert.alert(
          'Push not available',
          'Push notifications are only available on physical devices with permission granted.',
        );
        return;
      }
      const count = await sendPushTest();
      Alert.alert(
        'Test sent',
        count === 0
          ? 'No registered devices found on the server. Try signing out and back in.'
          : `Sent to ${count} device${count === 1 ? '' : 's'}. Check your notification tray.`,
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Text variant="body" tone="textMuted">
          Loading…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="h1" tone="text">
          Business profile
        </Text>
        {me?.email ? (
          <Text
            variant="bodySm"
            tone="textMuted"
            style={{ marginTop: 4, marginBottom: spacing.lg }}
          >
            Signed in as {me.email}
          </Text>
        ) : (
          <View style={{ height: spacing.lg }} />
        )}

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
        <Text variant="h3" tone="text" style={{ marginBottom: spacing.sm }}>
          Appearance
        </Text>
        <AppearancePicker />

        <View style={{ height: spacing.xl }} />
        <Button
          label="🔐 PIN lock"
          variant="secondary"
          onPress={() => router.push('/(app)/pin')}
        />

        <View style={{ height: spacing.md }} />
        <Button
          label="🔔 Send test notification"
          variant="secondary"
          onPress={onTestNotification}
        />

        <View style={{ height: spacing.md }} />
        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}

// ----- appearance (light / dark / system) -----

const APPEARANCE_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function AppearancePicker() {
  const { preference, setPreference } = useThemeMode();
  const colors = useThemeColors();

  return (
    <View style={[styles.segment, { borderColor: colors.border }]}>
      {APPEARANCE_OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.segmentItem,
              active && { backgroundColor: colors.accent },
            ]}
            onPress={() => setPreference(opt.value)}
          >
            <Text
              variant="bodySm"
              tone={active ? 'textOnPrimary' : 'textMuted'}
              style={styles.segmentText}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontWeight: '600' },
});
