import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Tile } from '../../components/Tile';
import { useAuth } from '../../lib/auth-context';
import { useMe } from '../../lib/queries';
import { ApiError } from '../../lib/api';
import { spacing } from '../../lib/theme';

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
        <Text variant="h1" tone="text" style={{ marginTop: spacing.sm }}>
          {businessName ? businessName : 'SeamFlow'}
        </Text>
        <Text
          variant="bodySm"
          tone="textMuted"
          style={{ marginTop: 4, marginBottom: spacing.lg }}
        >
          Tap a tile to get started
        </Text>

        {needsOnboarding ? (
          <View style={styles.onboardingCard}>
            <Text variant="h3" tone="text">
              Finish setup first
            </Text>
            <Text
              variant="bodySm"
              tone="textMuted"
              style={{ marginTop: 4, marginBottom: spacing.md }}
            >
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
                label="Orders"
                icon="list"
                description="Search, filter by status or due date"
                onPress={() => router.push('/(app)/orders')}
              />
            </View>
            <View style={styles.row}>
              <Tile
                label="Clients"
                icon="people"
                description="Search, add, manage clients"
                onPress={() => router.push('/(app)/clients')}
              />
              <View style={styles.gap} />
              <Tile
                label="Group orders"
                icon="albums"
                description="Bridal parties, family events"
                onPress={() => router.push('/(app)/groups')}
              />
            </View>
            <View style={styles.row}>
              <Tile
                label="Templates"
                icon="document-text"
                description="Measurement patterns by design"
                onPress={() => router.push('/(app)/templates')}
              />
              <View style={styles.gap} />
              <Tile
                label="Profile"
                icon="person-circle"
                description="Business info, sign out"
                onPress={() => router.push('/(app)/me')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  row: { flexDirection: 'row', marginBottom: spacing.md },
  gap: { width: spacing.md },
  onboardingCard: { marginTop: spacing.lg },
});
