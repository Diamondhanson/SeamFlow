// ============================================================================
// <SwipeableClientRow> — a client list row with WhatsApp-style swipe actions.
//
//   • Swipe LEFT  (reveals the right panel)  → toggle favorite ★
//   • Swipe RIGHT (reveals the left panel)   → delete (with confirmation)
//
// Favorite state is local/on-device (see lib/favorites). Delete goes through
// the API and always prompts before removing anything. Both actions fire once
// the row passes its open threshold, mirroring the iOS full-swipe feel.
// ============================================================================

import { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, useAtelierTheme } from '@seamflow/ui';
import type { Client } from '@seamflow/schemas';
import { Card, CardTitle, CardLine } from './Card';
import { useFavorites } from '../lib/favorites';
import { useDeleteClient } from '../lib/queries';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export function SwipeableClientRow({ item }: { item: Client }) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const del = useDeleteClient(item.id);
  const swipeRef = useRef<SwipeableMethods>(null);
  const fav = isFavorite(item.id);

  const confirmDelete = () => {
    Alert.alert(
      t('clients.deleteClientTitle'),
      t('clients.deleteConfirmBodyPermanent', { name: item.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => swipeRef.current?.close() },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            del.mutate(undefined, {
              onError: (err) => {
                swipeRef.current?.close();
                Alert.alert(
                  t('clients.couldNotDelete'),
                  err instanceof Error ? err.message : String(err),
                );
              },
            }),
        },
      ],
    );
  };

  const onOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Right panel opened = user swiped LEFT → favorite.
      toggleFavorite(item.id);
      swipeRef.current?.close();
    } else {
      // Left panel opened = user swiped RIGHT → delete.
      confirmDelete();
    }
  };

  const renderFavoriteAction = () => (
    <View
      style={[
        styles.action,
        styles.actionRight,
        { backgroundColor: colors.warning, borderRadius: radii.l },
      ]}
    >
      <Ionicons
        name={fav ? 'star' : 'star-outline'}
        size={24}
        color={colors.textOnPrimary}
      />
      <Text variant="caption" style={{ color: colors.textOnPrimary }}>
        {fav ? t('clients.unfavorite') : t('clients.favorite')}
      </Text>
    </View>
  );

  const renderDeleteAction = () => (
    <View
      style={[
        styles.action,
        styles.actionLeft,
        { backgroundColor: colors.danger, borderRadius: radii.l },
      ]}
    >
      <Ionicons name="trash-outline" size={24} color={colors.textOnPrimary} />
      <Text variant="caption" style={{ color: colors.textOnPrimary }}>
        {t('common.delete')}
      </Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={48}
      rightThreshold={48}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={renderDeleteAction}
      renderRightActions={renderFavoriteAction}
      onSwipeableOpen={onOpen}
    >
      <Card
        style={styles.card}
        onPress={() => router.push(`/(app)/clients/${item.id}`)}
      >
        <View style={styles.clientRow}>
          <Avatar name={item.fullName} size="md" />
          <View style={styles.clientText}>
            <View style={styles.nameRow}>
              <CardTitle>{item.fullName}</CardTitle>
              {fav ? (
                <Ionicons name="star" size={14} color={colors.warning} />
              ) : null}
            </View>
            <CardLine>{item.phone}</CardLine>
            {item.address ? <CardLine>{item.address}</CardLine> : null}
          </View>
        </View>
      </Card>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  // The list already spaces rows via ItemSeparatorComponent; drop the Card's
  // own bottom margin so the swipe-action panel lines up with the row height.
  card: { marginBottom: 0 },
  action: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionRight: { marginLeft: spacing.sm },
  actionLeft: { marginRight: spacing.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
