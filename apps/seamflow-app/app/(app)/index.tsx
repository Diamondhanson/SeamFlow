import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { Tile } from '../../components/Tile';
import { useAuth } from '../../lib/auth-context';
import { useMe } from '../../lib/queries';
import { ApiError } from '../../lib/api';
import { spacing } from '../../lib/theme';
import { CONTENT_MAX_WIDTH, useGridColumns } from '../../lib/use-breakpoint';

interface HomeTile {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  onPress: () => void;
  accent?: boolean;
}

const TILES: HomeTile[] = [
  {
    label: 'New order',
    icon: 'add-circle',
    accent: true,
    description: 'Start an order, with or without an existing client',
    onPress: () => router.push('/(app)/new-order'),
  },
  {
    label: 'Orders',
    icon: 'list',
    description: 'Search, filter by status or due date',
    onPress: () => router.push('/(app)/orders'),
  },
  {
    label: 'Clients',
    icon: 'people',
    description: 'Search, add, manage clients',
    onPress: () => router.push('/(app)/clients'),
  },
  {
    label: 'Group orders',
    icon: 'albums',
    description: 'Bridal parties, family events',
    onPress: () => router.push('/(app)/groups'),
  },
  {
    label: 'Templates',
    icon: 'document-text',
    description: 'Measurement patterns by design',
    onPress: () => router.push('/(app)/templates'),
  },
  {
    label: 'Profile',
    icon: 'person-circle',
    description: 'Business info, sign out',
    onPress: () => router.push('/(app)/me'),
  },
  {
    label: 'Calendar',
    icon: 'calendar',
    description: 'Delivery dates at a glance',
    onPress: () => router.push('/(app)/calendar'),
  },
];

const GRID_GAP = spacing.md;

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

  // Responsive grid: column count scales with screen width, and each cell is
  // sized off the (capped) content width so tiles stay square and aligned on
  // phones, tablets and landscape alike.
  const columns = useGridColumns();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - spacing.lg * 2;
  const tileWidth = Math.floor(
    (contentWidth - GRID_GAP * (columns - 1)) / columns,
  );

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
          <View style={styles.grid}>
            {TILES.map((tile) => (
              <View key={tile.label} style={{ width: tileWidth }}>
                <Tile
                  label={tile.label}
                  icon={tile.icon}
                  accent={tile.accent}
                  description={tile.description}
                  onPress={tile.onPress}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  onboardingCard: { marginTop: spacing.lg },
});
