import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, IconButton, useAtelierTheme } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SearchField } from '../../../components/SearchField';
import { SwipeableClientRow } from '../../../components/SwipeableClientRow';
import { useClients } from '../../../lib/queries';
import { useFavorites } from '../../../lib/favorites';
import { useDebouncedValue } from '../../../lib/use-debounced-value';
import { ApiError } from '../../../lib/api';
import { spacing } from '../../../lib/theme';
import { useFloatingScroll } from '../../../lib/floating-scroll';
import { useTranslation } from '../../../lib/i18n';
import { useDialog } from '../../../lib/dialog';

export default function ClientsList() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const [q, setQ] = useState('');
  // Debounce search so we don't refetch on every keystroke. The API uses
  // trigram-backed ILIKE on full_name + phone, so partial matches return fast.
  const debouncedQ = useDebouncedValue(q, 300);
  const { colors } = useAtelierTheme();
  const scroll = useFloatingScroll();

  const { data, isLoading, error } = useClients(debouncedQ);
  const { favorites } = useFavorites();

  useEffect(() => {
    if (error instanceof ApiError && error.isNotFound()) {
      void (async () => {
        if (
          await dialog.confirm({
            title: t('clients.profileRequiredTitle'),
            message: t('clients.profileRequiredBody'),
            confirmLabel: t('clients.goToProfile'),
          })
        )
          router.push('/(app)/me');
      })();
    }
  }, [error]);

  // Favorites float to the top; everyone is otherwise ordered alphabetically
  // by name (case-insensitive, locale-aware). Re-sorts when the favorite set
  // changes so a freshly-starred client jumps up immediately.
  const items = useMemo(() => {
    const list = data?.items ?? [];
    return [...list].sort((a, b) => {
      const favA = favorites.has(a.id);
      const favB = favorites.has(b.id);
      if (favA !== favB) return favA ? -1 : 1;
      return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
    });
  }, [data?.items, favorites]);

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={t('clients.title')}
          right={
            <IconButton
              variant="primary"
              onPress={() => router.push('/(app)/clients/new')}
              accessibilityLabel={t('clients.newClientA11y')}
            >
              <Ionicons name="add" size={24} color={colors.textOnPrimary} />
            </IconButton>
          }
        />
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder={t('clients.searchPlaceholder')}
        />
      </View>

      {isLoading && items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          {t('common.loading')}
        </Text>
      ) : items.length === 0 ? (
        <Text variant="bodySm" tone="textMuted" style={styles.muted}>
          {t('clients.emptyList')}
        </Text>
      ) : (
        <FlatList
          {...scroll}
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => <SwipeableClientRow item={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 96,
  },
  muted: { textAlign: 'center', marginTop: spacing.xl },
});
