// ============================================================================
// <TidyNotesSheet> — "Tidy up" a tailor's rough order notes with Claude.
//
// Text→text sibling of <AiDescribeSheet>: shows the current notes, a Tidy-up
// button, then Redo / Use-these-notes on the result (which the caller writes
// back into the notes field). Claude is fully wired on the backend; until the
// server has a funded ANTHROPIC_API_KEY the endpoint returns 503 and the error
// surfaces here.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import { useSummarizeNotes } from '../lib/ai';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The rough notes to tidy. */
  notes: string;
  /** Called with the tidied text when the user accepts it. */
  onAccept: (text: string) => void;
}

export function TidyNotesSheet({ visible, onClose, notes, onAccept }: Props) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const summarize = useSummarizeNotes();
  const [text, setText] = useState('');

  // Reset each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setText('');
      summarize.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const run = () => {
    summarize.mutate(notes, { onSuccess: (res) => setText(res.text) });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.overlay }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.head}>
            <Text variant="h3">{t('orders.tidyTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.banner,
              { backgroundColor: withAlpha(colors.primary, 0.14), borderRadius: radii.m },
            ]}
          >
            <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
            <Text variant="caption" tone="textMuted" style={styles.bannerText}>
              {t('orders.tidyBanner')}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* The rough notes going in. */}
            <Text variant="caption" tone="textMuted" style={styles.label}>
              {t('orders.tidyOriginal')}
            </Text>
            <View style={[styles.original, { backgroundColor: colors.surface, borderRadius: radii.m }]}>
              <Text variant="bodySm" tone="textMuted">{notes}</Text>
            </View>

            {!text && !summarize.isPending ? (
              <Pressable
                onPress={run}
                style={[styles.runBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
              >
                <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
                <Text variant="button" tone="textOnPrimary">{t('orders.tidyUp')}</Text>
              </Pressable>
            ) : null}

            {summarize.isPending ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
                  {t('orders.tidyingUp')}
                </Text>
              </View>
            ) : null}

            {summarize.isError && !text ? (
              <Text variant="bodySm" tone="danger" style={styles.errorText}>
                {summarize.error instanceof Error
                  ? summarize.error.message
                  : t('orders.tidyError')}
              </Text>
            ) : null}

            {text ? (
              <>
                <Text variant="caption" tone="textMuted" style={styles.editLabel}>
                  {t('orders.tidyEditLabel')}
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  multiline
                  style={[
                    styles.textArea,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: colors.hairline,
                      borderRadius: radii.m,
                    },
                  ]}
                />
                <View style={styles.actions}>
                  <Pressable
                    onPress={run}
                    style={[styles.secondaryBtn, { borderColor: colors.hairline, borderRadius: radii.pill }]}
                  >
                    <Ionicons name="refresh" size={15} color={colors.text} />
                    <Text variant="caption" tone="text">{t('orders.tidyRedo')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onAccept(text);
                      onClose();
                    }}
                    style={[styles.acceptBtn, { backgroundColor: colors.success, borderRadius: radii.pill }]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                    <Text variant="button" tone="textOnPrimary">{t('orders.tidyUse')}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
    width: '95%',
    maxHeight: '85%',
    borderRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerText: { flex: 1 },
  body: { paddingBottom: spacing.md },
  label: { marginBottom: 4 },
  original: { padding: spacing.md, marginBottom: spacing.md },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
  },
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
  errorText: { marginTop: spacing.md, textAlign: 'center' },
  editLabel: { marginBottom: 4 },
  textArea: {
    minHeight: 140,
    borderWidth: 1,
    padding: spacing.md,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
  },
});
