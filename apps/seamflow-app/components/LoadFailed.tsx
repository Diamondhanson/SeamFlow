// ============================================================================
// <LoadFailed> — what a list shows when the request failed.
//
// Not cosmetic. Fifteen list screens used to branch straight from "still
// loading" to "you have nothing": they read `{ data, isLoading }` and never
// `isError`, so a failed fetch left `isLoading` false and the rows empty, and a
// tailor with fifty orders was told "no orders match".
//
// That is a worse outcome than an error, because it is believable. The tailor
// has no reason to doubt it, so they do not retry — they wonder where their
// work went. It bites hardest on a first load or a fresh sign-in, when there is
// no cached data to fall back on, which is also exactly when the free-tier API
// may be cold-starting and taking the better part of a minute to answer.
//
// So: say that it failed, and give them the one useful action.
//
//   {isLoading && !items.length ? <SkeletonList /> :
//    isError && !items.length ? <LoadFailed onRetry={refetch} /> :
//    !items.length ? <Empty /> : <List />}
//
// The `!items.length` guard on this branch matters: a background refetch that
// fails while rows are already on screen must NOT replace them with this. Stale
// data beats an error message when there is stale data to show.
// ============================================================================

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme } from '@seamflow/ui';
import { Button } from './Button';
import { radii, spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

interface LoadFailedProps {
  /** Refetch the query. Omit only where there is genuinely nothing to retry. */
  onRetry?: () => void;
  /** Override the message where a screen can say something more specific. */
  message?: string;
}

export function LoadFailed({ onRetry, message }: LoadFailedProps) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
      <Text variant="bodySm" tone="textMuted" style={styles.message}>
        {message ?? t('common.loadFailed')}
      </Text>
      {onRetry ? (
        <View style={styles.button}>
          <Button
            label={t('common.retry')}
            variant="secondary"
            onPress={onRetry}
            // Sizes to the label rather than spilling across the row — this
            // sits in the middle of an otherwise empty list.
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  message: { textAlign: 'center' },
  button: { marginTop: spacing.xs },
});
