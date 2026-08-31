// "My requests" — what I have asked for, and how many tailors answered.
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { garmentLabel } from '@seamflow/schemas';
import { Text } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { FormScroll } from '../../../components/FormScroll';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import { Card, CardLine, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { useMyRequests } from '../../../lib/queries';
import { spacing, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

export default function MyRequests() {
  const { t, language } = useTranslation();
  const colors = useThemeColors();
  const q = useMyRequests();
  const items = q.data?.items ?? [];

  return (
    <Screen>
      <ScreenHeader title={t('requests.mineTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: 96 }}>
        <Button
          label={t('requests.askForSomething')}
          onPress={() => router.push('/(app)/requests/new')}
        />
        <View style={{ height: spacing.lg }} />

        {q.isLoading ? (
          <SkeletonList leading="square" chip />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textMuted} />
            <Text variant="bodySm" tone="textMuted" style={styles.emptyText}>
              {t('requests.mineEmpty')}
            </Text>
          </View>
        ) : (
          items.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/(app)/requests/${r.id}`)}>
              <Card>
                <CardTitle>{r.title || garmentLabel(r.garmentType, language)}</CardTitle>
                <CardLine>{t('requests.statusLine', { status: r.status })}</CardLine>
                <CardLine>{t('requests.offerCount', { count: r.offersCount })}</CardLine>
              </Card>
            </Pressable>
          ))
        )}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', maxWidth: 300 },
});
