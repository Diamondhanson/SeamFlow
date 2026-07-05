// ============================================================================
// <AiDescribeSheet> — "Auto-describe" UI for a saved image (M3, front-end only).
//
// Pick a mode (Spec / Fabric / Tags), tap Describe, then Accept / Edit /
// Discard the result. The description currently comes from a local STUB
// (lib/ai) — Claude is not connected yet. A banner makes that explicit so the
// look can be reviewed without misleading anyone that it's live.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useAtelierTheme, withAlpha } from '@seamflow/ui';
import type { AiDescribeMode } from '@seamflow/schemas';
import { useDescribeImage } from '../lib/ai';
import { spacing } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Preview image (signed URL). */
  imageUrl?: string;
  /** Storage path passed through to the (future) backend. */
  storagePath: string;
  /** Called when the user accepts the (edited) description. */
  onAccept: (result: { text: string; tags?: string[] }) => void;
}

const MODES: { key: AiDescribeMode }[] = [
  { key: 'spec' },
  { key: 'fabric' },
  { key: 'tags' },
];

export function AiDescribeSheet({
  visible,
  onClose,
  imageUrl,
  storagePath,
  onAccept,
}: Props) {
  const { t } = useTranslation();
  const { colors, radii } = useAtelierTheme();
  const describe = useDescribeImage();
  const [mode, setMode] = useState<AiDescribeMode>('spec');
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[] | undefined>(undefined);

  // Reset when reopened.
  useEffect(() => {
    if (visible) {
      setMode('spec');
      setText('');
      setTags(undefined);
      describe.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const run = () => {
    describe.mutate(
      { storagePath, mode },
      {
        onSuccess: (res) => {
          setText(res.text);
          setTags(res.tags);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.scrim }]} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.overlay }]} onStartShouldSetResponder={() => true}>
          <View style={styles.head}>
            <Text variant="h3">{t('designs.autoDescribe')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* AI drafts can be wrong — nudge the user to review before saving. */}
          <View
            style={[
              styles.banner,
              { backgroundColor: withAlpha(colors.primary, 0.14), borderRadius: radii.m },
            ]}
          >
            <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
            <Text variant="caption" tone="textMuted" style={styles.bannerText}>
              {t('designs.aiBanner')}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={[styles.preview, { backgroundColor: colors.surface, borderRadius: radii.m }]}
                resizeMode="cover"
              />
            ) : null}

            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const active = m.key === mode;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMode(m.key)}
                    style={[
                      styles.modeChip,
                      {
                        borderColor: active ? colors.primary : colors.hairline,
                        backgroundColor: active ? withAlpha(colors.primary, 0.14) : 'transparent',
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Text variant="caption" tone={active ? 'text' : 'textMuted'}>
                      {t('designs.mode_' + m.key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!text && !describe.isPending ? (
              <Pressable
                onPress={run}
                style={[styles.describeBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
              >
                <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
                <Text variant="button" tone="textOnPrimary">{t('designs.describe')}</Text>
              </Pressable>
            ) : null}

            {describe.isPending ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
                  {t('designs.readingImage')}
                </Text>
              </View>
            ) : null}

            {describe.isError && !text ? (
              <Text variant="bodySm" tone="danger" style={styles.errorText}>
                {describe.error instanceof Error
                  ? describe.error.message
                  : t('designs.describeError')}
              </Text>
            ) : null}

            {text ? (
              <>
                <Text variant="caption" tone="textMuted" style={styles.editLabel}>
                  {t('designs.editBeforeSaving')}
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  multiline
                  style={[
                    styles.textArea,
                    { color: colors.text, backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: radii.m },
                  ]}
                />
                <View style={styles.actions}>
                  <Pressable
                    onPress={run}
                    style={[styles.secondaryBtn, { borderColor: colors.hairline, borderRadius: radii.pill }]}
                  >
                    <Ionicons name="refresh" size={15} color={colors.text} />
                    <Text variant="caption" tone="text">{t('designs.redo')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onAccept({ text, tags });
                      onClose();
                    }}
                    style={[styles.acceptBtn, { backgroundColor: colors.success, borderRadius: radii.pill }]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                    <Text variant="button" tone="textOnPrimary">{t('designs.accept')}</Text>
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
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
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
  preview: { width: '100%', height: 160, marginBottom: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeChip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderWidth: 1 },
  describeBtn: {
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
    minHeight: 120,
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
