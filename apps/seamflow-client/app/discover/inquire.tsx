// ============================================================================
// Inquire — the moment discovery becomes a conversation (ROADMAP D.6.4).
//
// Prefilled rather than blank: a blank box after "Ask about this" makes people
// freeze. A sentence they can send as-is or edit gets the thread started, which
// is the only thing that matters here.
//
// Re-inquiring about the same design reuses the existing thread (the API
// enforces that with a partial unique index), so this can't spawn duplicates.
// ============================================================================

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Text } from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormScroll } from '../../components/FormScroll';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCreateConversation } from '../../lib/queries';
import { useAuth } from '../../lib/auth-context';
import { useDialog } from '../../lib/dialog';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function Inquire() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const dialog = useDialog();
  const params = useLocalSearchParams<{
    designId?: string;
    tailorId: string;
    tailorName?: string;
  }>();

  const { session } = useAuth();
  const create = useCreateConversation();
  const [message, setMessage] = useState(t('discover.inquirePlaceholder'));

  const send = () => {
    const body = message.trim();
    if (!body) return;
    create.mutate(
      {
        tailorId: params.tailorId,
        designPostId: params.designId ?? null,
        firstMessage: body,
      },
      {
        onSuccess: (conversation) => {
          // Straight into the thread — the reply is what they're waiting for.
          router.replace({
            pathname: '/(app)/messages/[id]',
            params: { id: conversation.id },
          });
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  // Reachable by direct URL, so it guards itself rather than trusting the
  // caller to have gated. Sending a message is the one thing that needs a name
  // attached to it.
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Screen>
      <ScreenHeader title={t('discover.inquireTitle')} />
      <FormScroll contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={[styles.intro, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <Text variant="bodySm" tone="textMuted">
            {t('discover.inquireBody', { name: params.tailorName ?? '' })}
          </Text>
        </View>

        <Input
          label={t('discover.inquireTitle')}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <View style={styles.cta}>
          <Button
            label={create.isPending ? t('discover.inquireSending') : t('discover.inquireSend')}
            onPress={send}
            disabled={create.isPending || !message.trim()}
            loading={create.isPending}
          />
        </View>
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { padding: spacing.md, marginBottom: spacing.lg },
  cta: { marginTop: spacing.lg },
});
