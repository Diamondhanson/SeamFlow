import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Tile } from '../../components/Tile';
import { useAuth } from '../../lib/auth-context';
import { useMe } from '../../lib/queries';
import { ApiError } from '../../lib/api';
import { colors, spacing } from '../../lib/theme';

export default function Home() {
  const { signOut } = useAuth();
  const { data: me, error } = useMe();

  // If the JWT is dead, drop the session.
  useEffect(() => {
    if (error instanceof ApiError && error.isUnauthorized()) {
      signOut();
    }
  }, [error, signOut]);

  const businessName = me?.tailor?.businessName ?? null;
  const needsOnboarding = me ? !me.tailor : false;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.greeting}>{businessName ? businessName : 'SeamFlow'}</Text>
        <Text style={styles.muted}>Tap a tile to get started</Text>

        {needsOnboarding ? (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>Finish setup first</Text>
            <Text style={styles.onboardingDesc}>
              Set up your business profile to start adding clients and orders.
            </Text>
            <Tile
              label="Set up profile"
              icon="person-circle"
              accent
              onPress={() => router.push('/(app)/me')}
            />
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <Tile
                label="New order"
                icon="add-circle"
                accent
                description="Start an order, with or without an existing client"
                onPress={() => router.push('/(app)/new-order')}
              />
              <View style={styles.gap} />
              <Tile
                label="Clients"
                icon="people"
                description="Search, add, manage clients"
                onPress={() => router.push('/(app)/clients')}
              />
            </View>
            <View style={styles.row}>
              <Tile
                label="Group orders"
                icon="albums"
                description="Bridal parties, family events"
                onPress={() => router.push('/(app)/groups')}
              />
              <View style={styles.gap} />
              <Tile
                label="Templates"
                icon="document-text"
                description="Measurement patterns by design"
                onPress={() => router.push('/(app)/templates')}
              />
            </View>
            <View style={styles.row}>
              <Tile
                label="Profile"
                icon="person-circle"
                description="Business info, sign out"
                onPress={() => router.push('/(app)/me')}
              />
              <View style={styles.gap} />
              <View style={{ flex: 1 }} />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  greeting: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  muted: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  row: { flexDirection: 'row', marginBottom: spacing.md },
  gap: { width: spacing.md },
  onboardingCard: { marginTop: spacing.lg },
  onboardingTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  onboardingDesc: {
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
});
