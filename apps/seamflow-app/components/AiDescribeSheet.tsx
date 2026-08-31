// ============================================================================
// <AiDescribeSheet> — "Auto-describe" UI for a saved image.
//
// Pick one or MORE modes (Spec / Fabric / Tags), tap Describe — selected modes
// run in parallel and their results combine into one editable draft (spec +
// fabric prose stacked, tags merged). Accept / Edit / Discard as before.
// Output is sanitized to plain text (no markdown) before it reaches the
// caption field.
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
import { Text, activeFontFamilies, useAtelierTheme, useFieldFocus, withAlpha } from '@seamflow/ui';
import type { AiDescribeMode } from '@seamflow/schemas';
import { api } from '../lib/api';
import { stripMarkdown } from './RichText';
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
  // The textarea's own border is the focus indicator, which is what lets us
  // drop the browser's inner ring on web (see useFieldFocus).
  const { focused, focusProps, webReset } = useFieldFocus();
  const [modes, setModes] = useState<Set<AiDescribeMode>>(new Set(['spec']));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[] | undefined>(undefined);

  // Reset when reopened.
  useEffect(() => {
    if (visible) {
      setModes(new Set(['spec']));
      setPending(false);
      setError(null);
      setText('');
      setTags(undefined);
    }
  }, [visible]);

  const toggleMode = (key: AiDescribeMode) =>
    setModes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one selected
      } else {
        next.add(key);
      }
      return next;
    });

  // Run every selected mode in parallel; stack the prose results in a fixed
  // order and merge tags from the tags mode.
  const run = async () => {
    const selected = MODES.map((m) => m.key).filter((k) => modes.has(k));
    setPending(true);
    setError(null);
    try {
      const results = await Promise.all(
        selected.map((mode) => api.ai.describeImage({ storagePath, mode })),
      );
      const prose = results
        .filter((r) => r.mode !== 'tags')
        .map((r) => stripMarkdown(r.text).trim())
        .filter(Boolean);
      const tagRes = results.find((r) => r.mode === 'tags');
      setText(prose.join('\n\n'));
      setTags(tagRes?.tags);
      // Tags-only run: show the tags line as the editable text.
      if (prose.length === 0 && tagRes) setText(tagRes.tags?.join(', ') ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('designs.describeError'));
    } finally {
      setPending(false);
    }
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

            <Text variant="caption" tone="textMuted" style={styles.modesHint}>
              {t('designs.modesHint')}
            </Text>
            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const active = modes.has(m.key);
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => toggleMode(m.key)}
                    style={[
                      styles.modeChip,
                      {
                        borderColor: active ? colors.primary : colors.hairline,
                        backgroundColor: active ? withAlpha(colors.primary, 0.14) : 'transparent',
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    {active ? (
                      <Ionicons name="checkmark" size={13} color={colors.primary} />
                    ) : null}
                    <Text variant="caption" tone={active ? 'text' : 'textMuted'}>
                      {t('designs.mode_' + m.key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!text && !pending ? (
              <Pressable
                onPress={run}
                style={[styles.describeBtn, { backgroundColor: colors.primary, borderRadius: radii.pill }]}
              >
                <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
                <Text variant="button" tone="textOnPrimary">{t('designs.describe')}</Text>
              </Pressable>
            ) : null}

            {pending ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text variant="bodySm" tone="textMuted" style={{ marginTop: spacing.sm }}>
                  {t('designs.readingImage')}
                </Text>
              </View>
            ) : null}

            {error && !text ? (
              <Text variant="bodySm" tone="danger" style={styles.errorText}>
                {error}
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
                  {...focusProps}
                  style={[
                    styles.textArea,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: focused ? colors.primary : colors.hairline,
                      borderRadius: radii.m,
                    },
                    webReset,
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
  modesHint: { marginBottom: 6 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
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
    fontFamily: activeFontFamilies.body,
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
