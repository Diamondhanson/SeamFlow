// ============================================================================
// Tailor copilot — the chat screen (docs/tailor-copilot-plan.md).
//
// Ask about the business, or ask it to act. Reads run server-side; writes
// come back as a pendingAction rendered as a CONFIRM CARD — composed from
// structured display values (never model prose) and executed through the
// same api-client + react-query paths the forms use. The conversation lives
// ON THIS DEVICE only (AsyncStorage, capped, clearable) — nothing is stored
// server-side.
//
// Voice (Tier 1, on-device): the mic streams a live transcript into the
// input with a pulsing "listening" indicator; replies can be spoken aloud
// with a per-bubble speaker + a header toggle, with a "speaking" state.
// Both degrade gracefully on builds without the native modules.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
// KeyboardStickyView translates the composer bar in lockstep with the real
// keyboard (native IME insets), and useReanimatedKeyboardAnimation drives the
// matching list padding — reliable under edge-to-edge Android (phones and
// tablets alike), where OS window modes and generic avoiding views misbehave.
import {
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import type { ActionPreview } from '@seamflow/schemas';
import {
  Text,
  Chip,
  IconButton,
  useAtelierTheme,
  useFieldFocus,
  withAlpha,
} from '@seamflow/ui';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { HelpCard } from '../../components/HelpCard';
import { Button } from '../../components/Button';
import { RichText, stripMarkdown } from '../../components/RichText';
import { MarkdownText } from '../../components/MarkdownText';
import { api, ApiError } from '../../lib/api';
import { alertPermissionDenied } from '../../lib/permissions';
import {
  ACTION_TITLE_KEY,
  DISPLAY_FIELD_KEY,
  TOOL_LABEL_KEY,
  clearThread,
  executeAssistantAction,
  loadThread,
  newMessageId,
  saveThread,
  toWireHistory,
  type LocalChatMessage,
} from '../../lib/assistant';
import {
  getVoiceSupport,
  requestMicPermission,
  speak,
  startListening,
  stopListening,
  stopSpeaking,
} from '../../lib/voice';
import { useMe } from '../../lib/queries';
import { radii, spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { useDialog } from '../../lib/dialog';

const SPEAK_PREF_KEY = 'seamflow.assistant.speakReplies';

// Composer growth: one line tall at rest, grows with content to 5 lines, then
// scrolls internally. Height is driven from onContentSizeChange because iOS
// doesn't reliably auto-grow multiline TextInputs the way Android does.
const INPUT_LINE_H = 20;
const INPUT_MAX_H = INPUT_LINE_H * 5;

export default function AssistantScreen() {
  const { t, language } = useTranslation();
  const { colors } = useAtelierTheme();
  // The field's own border is the focus indicator, which is what lets us
  // drop the browser's inner ring on web (see useFieldFocus).
  const { focused, focusProps, webReset } = useFieldFocus();
  const dialog = useDialog();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const tailorId = me?.tailor?.id;

  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [threadReady, setThreadReady] = useState(false);
  const [input, setInput] = useState('');
  const [inputContentH, setInputContentH] = useState(INPUT_LINE_H);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ActionPreview | null>(null);
  const [executing, setExecuting] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const listRef = useRef<FlatList<LocalChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const voice = useMemo(() => getVoiceSupport(), []);

  // Opened from the "Ask" pill (/(app)/assistant?focus=1): focus the composer
  // so the keyboard is already up and the tailor can start typing immediately.
  const params = useLocalSearchParams<{ focus?: string }>();
  const didAutofocus = useRef(false);
  useEffect(() => {
    if (params.focus === '1' && !didAutofocus.current && tailorId) {
      didAutofocus.current = true;
      const id = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(id);
    }
  }, [params.focus, tailorId]);

  // Keyboard-follow: the composer translates up by (keyboard − bottom inset)
  // via KeyboardStickyView; the list gets the same amount of animated bottom
  // padding so the newest messages stay visible above the raised bar.
  const insets = useSafeAreaInsets();
  const { height: kbHeight } = useReanimatedKeyboardAnimation(); // 0 → -kb px
  const listKbPad = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, -kbHeight.value - insets.bottom),
  }));

  // ---- on-device thread: load per tailor, persist on every change ----------
  useEffect(() => {
    if (!tailorId) return;
    let cancelled = false;
    void loadThread(tailorId).then((m) => {
      if (!cancelled) {
        setMessages(m);
        setThreadReady(true);
      }
    });
    void AsyncStorage.getItem(SPEAK_PREF_KEY).then((v) => {
      if (!cancelled && v === '1') setSpeakOn(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tailorId]);

  const persist = useCallback(
    (next: LocalChatMessage[]) => {
      setMessages(next);
      if (tailorId) void saveThread(tailorId, next);
    },
    [tailorId],
  );

  // Stop any speech when leaving the screen.
  useEffect(() => () => stopSpeaking(), []);

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  // Android resize mode shrinks the window when the keyboard opens — keep the
  // latest messages in view instead of letting them slip under the input bar.
  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => scrollToEnd(),
    );
    return () => sub.remove();
  }, []);

  // ---- speaking (TTS) -------------------------------------------------------
  const speakMessage = useCallback(
    (m: LocalChatMessage) => {
      if (speakingId === m.id) {
        stopSpeaking();
        setSpeakingId(null);
        return;
      }
      // Read the plain words — never the ** markdown markers.
      const ok = speak(stripMarkdown(m.content), language, {
        onStart: () => setSpeakingId(m.id),
        onDone: () => setSpeakingId(null),
      });
      if (!ok) setSpeakingId(null);
    },
    [language, speakingId],
  );

  const toggleSpeakReplies = () => {
    const next = !speakOn;
    setSpeakOn(next);
    void AsyncStorage.setItem(SPEAK_PREF_KEY, next ? '1' : '0');
    if (!next) {
      stopSpeaking();
      setSpeakingId(null);
    }
  };

  // ---- sending a turn -------------------------------------------------------
  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sending || !tailorId) return;
    if (listening) stopListening();
    setInput('');
    setPending(null);

    const userMsg: LocalChatMessage = {
      id: newMessageId(),
      role: 'user',
      content: text,
    };
    const withUser = [...messages, userMsg];
    persist(withUser);
    scrollToEnd();
    setSending(true);
    try {
      const res = await api.assistant.chat({ messages: toWireHistory(withUser) });
      const assistantMsg: LocalChatMessage | null = res.reply
        ? {
            id: newMessageId(),
            role: 'assistant',
            content: res.reply,
            toolsUsed: res.toolsUsed,
          }
        : null;
      persist(assistantMsg ? [...withUser, assistantMsg] : withUser);
      setPending(res.pendingAction);
      if (assistantMsg && speakOn) speakMessage(assistantMsg);
    } catch (err) {
      const content =
        err instanceof ApiError && err.status === 503
          ? t('assistant.unavailableBody')
          : t('assistant.offlineOrFailed');
      persist([
        ...withUser,
        { id: newMessageId(), role: 'assistant', content, kind: 'error' },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  // ---- confirm card ---------------------------------------------------------
  const actionTitle = (a: ActionPreview) => {
    const key = ACTION_TITLE_KEY[a.tool];
    return key ? t(key) : t('assistant.actionUnknown');
  };

  const confirmAction = async () => {
    if (!pending || executing) return;
    setExecuting(true);
    try {
      const { link } = await executeAssistantAction(pending, qc);
      const title = actionTitle(pending);
      const done: LocalChatMessage = link
        ? {
            id: newMessageId(),
            role: 'assistant',
            content: t('assistant.doneLink', { url: link }),
            kind: 'done',
            link,
          }
        : {
            id: newMessageId(),
            role: 'assistant',
            content: t('assistant.doneGeneric', { title }),
            kind: 'done',
          };
      persist([...messages, done]);
      setPending(null);
      scrollToEnd();
    } catch (err) {
      await dialog.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const cancelAction = () => {
    setPending(null);
    persist([
      ...messages,
      { id: newMessageId(), role: 'assistant', content: t('assistant.cancelled') },
    ]);
  };

  // ---- voice input (STT) ----------------------------------------------------
  const toggleMic = async () => {
    if (listening) {
      stopListening();
      return;
    }
    if (!voice.stt) {
      await dialog.alert({
        title: t('assistant.title'),
        message: t('assistant.voiceNeedsRebuild'),
        tone: 'warning',
      });
      return;
    }
    const perm = await requestMicPermission();
    if (!perm.granted) {
      // Same recovery flow as camera/photos: when the OS has permanently
      // silenced its own prompt (prior denial), offer Open Settings — a plain
      // "allow the mic" alert would be a dead end the user can't act on.
      await alertPermissionDenied('microphone', perm.canAskAgain, dialog, t);
      return;
    }
    const started = startListening(language, {
      onPartial: setInput,
      onFinal: setInput,
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    setListening(started);
  };

  // ---- clear ----------------------------------------------------------------
  const onClear = async () => {
    const ok = await dialog.confirm({
      title: t('assistant.clearTitle'),
      message: t('assistant.clearBody'),
      confirmLabel: t('common.clear'),
      destructive: true,
    });
    if (!ok || !tailorId) return;
    stopSpeaking();
    setSpeakingId(null);
    setPending(null);
    setMessages([]);
    await clearThread(tailorId);
  };

  // ---- render ---------------------------------------------------------------
  const checkedCaption = (toolsUsed?: string[]) => {
    if (!toolsUsed?.length) return null;
    const labels = [...new Set(toolsUsed)]
      .map((name) => (TOOL_LABEL_KEY[name] ? t(TOOL_LABEL_KEY[name]) : null))
      .filter(Boolean)
      .join(' · ');
    return labels ? t('assistant.checkedCaption', { list: labels }) : null;
  };

  const renderBubble = ({ item: m }: { item: LocalChatMessage }) => {
    if (m.role === 'user') {
      return (
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text variant="body" tone="textOnPrimary">
            {m.content}
          </Text>
        </View>
      );
    }
    const isDone = m.kind === 'done';
    const isError = m.kind === 'error';
    const tint = isDone ? colors.success : isError ? colors.danger : colors.border;
    const caption = checkedCaption(m.toolsUsed);
    return (
      <View style={styles.assistantWrap}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
          <Ionicons
            name={isDone ? 'checkmark' : isError ? 'alert' : 'sparkles-outline'}
            size={14}
            color={isDone ? colors.success : isError ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.assistantCol}>
          <Pressable
            disabled={!m.link}
            onPress={() => m.link && void Linking.openURL(m.link)}
            style={[
              styles.bubble,
              styles.assistantBubble,
              {
                backgroundColor: isDone
                  ? withAlpha(colors.success, 0.08)
                  : isError
                    ? withAlpha(colors.danger, 0.08)
                    : colors.surface,
                borderColor: withAlpha(tint, isDone || isError ? 0.35 : 1),
              },
            ]}
          >
            {isDone || isError || m.link ? (
              // App-generated bubbles (done ✓ / error / link) stay simple text.
              <RichText variant="body" tone={m.link ? 'primary' : 'text'}>
                {m.content}
              </RichText>
            ) : (
              // Model replies render full markdown — bold, headings, bullets,
              // small tables — themed, never raw symbols.
              <MarkdownText>{m.content}</MarkdownText>
            )}
          </Pressable>
          <View style={styles.bubbleMetaRow}>
            {caption ? (
              <Text variant="caption" tone="textMuted" style={styles.caption}>
                {caption}
              </Text>
            ) : (
              <View style={styles.captionSpacer} />
            )}
            {voice.tts && !isError ? (
              <Pressable
                onPress={() => speakMessage(m)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('assistant.speakBubbleA11y')}
                style={styles.speakBtn}
              >
                <Ionicons
                  name={speakingId === m.id ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingId === m.id ? colors.primary : colors.textMuted}
                />
                {speakingId === m.id ? (
                  <Text variant="caption" tone="primary">
                    {t('assistant.speaking')}
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const emptyState = (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
        <Ionicons name="sparkles" size={28} color={colors.primary} />
      </View>
      <Text variant="body" tone="textMuted" style={styles.emptyText}>
        {t('assistant.emptyHello')}
      </Text>
      <View style={styles.suggestions}>
        {(['suggestionDue', 'suggestionOwed', 'suggestionBusiness'] as const).map((k) => (
          <Chip key={k} label={t('assistant.' + k)} tone="primary" onPress={() => void send(t('assistant.' + k))} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader
          title={t('assistant.title')}
          subtitle={t('assistant.subtitle')}
          right={
            <View style={styles.headerActions}>
              {voice.tts ? (
                <IconButton
                  variant={speakOn ? 'primary' : 'ghost'}
                  onPress={toggleSpeakReplies}
                  accessibilityLabel={t('assistant.speakReplies')}
                >
                  <Ionicons
                    name={speakOn ? 'volume-high' : 'volume-mute-outline'}
                    size={20}
                    color={speakOn ? colors.textOnPrimary : colors.textMuted}
                  />
                </IconButton>
              ) : null}
              <IconButton
                variant="ghost"
                onPress={onClear}
                accessibilityLabel={t('assistant.clearA11y')}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </IconButton>
            </View>
          }
        />
        <HelpCard
          guideKey="flow.assistant"
          icon="sparkles-outline"
          title={t('guides.assistantTitle')}
          message={t('guides.assistantBody')}
        />
      </View>

      <Animated.View style={[styles.flex, listKbPad]}>
        <FlatList
          ref={listRef}
          data={threadReady ? messages : []}
          keyExtractor={(m) => m.id}
          renderItem={renderBubble}
          contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={threadReady ? emptyState : null}
          ListFooterComponent={
            <>
              {sending ? <ThinkingBubble label={t('assistant.thinking')} /> : null}
              {pending ? (
                <ConfirmCard
                  action={pending}
                  title={actionTitle(pending)}
                  executing={executing}
                  onConfirm={confirmAction}
                  onCancel={cancelAction}
                />
              ) : null}
            </>
          }
        />

      </Animated.View>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        {listening ? (
          <View style={styles.listeningRow}>
            <PulsingDot color={colors.danger} />
            <Text variant="bodySm" tone="textMuted">
              {t('assistant.listening')}
            </Text>
          </View>
        ) : null}

        <View style={[styles.inputBar, { borderTopColor: colors.hairline, backgroundColor: colors.bg }]}>
          <IconButton
            variant={listening ? 'primary' : 'ghost'}
            onPress={toggleMic}
            accessibilityLabel={listening ? t('assistant.micStopA11y') : t('assistant.micA11y')}
          >
            <Ionicons
              name={listening ? 'stop' : 'mic-outline'}
              size={20}
              color={listening ? colors.textOnPrimary : colors.textMuted}
            />
          </IconButton>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.surface,
                borderColor: focused ? colors.primary : colors.border,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!sending && !!tailorId}
              onSubmitEditing={() => void send()}
              onContentSizeChange={(e) =>
                setInputContentH(e.nativeEvent.contentSize.height)
              }
              scrollEnabled={inputContentH > INPUT_MAX_H}
              {...focusProps}
              style={[
                styles.input,
                webReset,
                {
                  color: colors.text,
                  height: Math.min(
                    Math.max(inputContentH, INPUT_LINE_H),
                    INPUT_MAX_H,
                  ),
                },
              ]}
            />
          </View>
          <IconButton
            variant="primary"
            onPress={() => void send()}
            disabled={sending || !input.trim() || !tailorId}
            accessibilityLabel={t('assistant.send')}
          >
            <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
          </IconButton>
        </View>
      </KeyboardStickyView>
    </Screen>
  );
}

// ----------------------------------------------------------------------------
// Confirm card — composed from structured display values, never model prose.
// ----------------------------------------------------------------------------

function ConfirmCard({
  action,
  title,
  executing,
  onConfirm,
  onCancel,
}: {
  action: ActionPreview;
  title: string;
  executing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const known = !!ACTION_TITLE_KEY[action.tool];
  return (
    <View
      style={[
        styles.confirmCard,
        { backgroundColor: colors.surface, borderColor: withAlpha(colors.primary, 0.35) },
      ]}
    >
      <View style={styles.confirmHead}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
        <Text variant="label" tone="primary">
          {t('assistant.confirmHeading')}
        </Text>
      </View>
      <Text variant="h3" style={styles.confirmTitle}>
        {title}
      </Text>
      {Object.entries(action.display).map(([k, v]) =>
        v ? (
          <View key={k} style={styles.confirmRow}>
            <Text variant="bodySm" tone="textMuted" style={styles.confirmKey}>
              {DISPLAY_FIELD_KEY[k] ? t(DISPLAY_FIELD_KEY[k]) : k}
            </Text>
            <Text variant="bodySm" style={styles.confirmVal}>
              {v}
            </Text>
          </View>
        ) : null,
      )}
      {action.warnings.map((w, i) => (
        <Text key={i} variant="bodySm" tone="warning" style={styles.confirmWarning}>
          {w}
        </Text>
      ))}
      <Text variant="caption" tone="textMuted" style={styles.confirmHint}>
        {t('assistant.confirmHint')}
      </Text>
      <View style={styles.confirmButtons}>
        <View style={styles.flex}>
          <Button
            label={executing ? t('assistant.working') : t('assistant.confirm')}
            onPress={onConfirm}
            loading={executing}
            disabled={!known}
          />
        </View>
        <View style={{ width: spacing.sm }} />
        <View style={styles.flex}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Indicators — thinking dots + pulsing listening dot
// ----------------------------------------------------------------------------

function ThinkingBubble({ label }: { label: string }) {
  const { colors } = useAtelierTheme();
  return (
    <View style={styles.assistantWrap}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
      </View>
      <View
        style={[
          styles.bubble,
          styles.assistantBubble,
          styles.thinkingBubble,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {[0, 1, 2].map((i) => (
          <ThinkingDot key={i} index={i} color={colors.textMuted} />
        ))}
        <Text variant="bodySm" tone="textMuted" style={styles.thinkingLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function ThinkingDot({ index, color }: { index: number; color: string }) {
  const opacity = useSharedValue(0.25);
  useEffect(() => {
    opacity.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(withTiming(1, { duration: 380 }), withTiming(0.25, { duration: 380 })),
        -1,
      ),
    );
  }, [index, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1,
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  bubble: {
    maxWidth: '85%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  assistantWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  assistantCol: { flex: 1 },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    minHeight: 16,
  },
  caption: { flexShrink: 1 },
  captionSpacer: { flex: 1 },
  speakBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },

  empty: { alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { textAlign: 'center', marginBottom: spacing.lg },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },

  confirmCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  confirmHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmTitle: { marginTop: 4, marginBottom: spacing.sm },
  confirmRow: { flexDirection: 'row', marginBottom: 2, gap: spacing.sm },
  confirmKey: { width: 96 },
  confirmVal: { flex: 1 },
  confirmWarning: { marginTop: spacing.xs },
  confirmHint: { marginTop: spacing.sm },
  confirmButtons: { flexDirection: 'row', marginTop: spacing.md },

  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  thinkingLabel: { marginStart: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },

  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 8,
  },
  input: { fontSize: 15, lineHeight: INPUT_LINE_H, padding: 0 },
});
