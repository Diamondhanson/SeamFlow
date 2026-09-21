// ============================================================================
// ChatThread — the one conversation screen, shared by BOTH sides.
//
// The tailor thread (app/(app)/messages/[id].tsx) and the client thread
// (app/(client)/hub/messages/[id].tsx) are the same screen; only the role, the
// i18n namespace and a couple of header actions differ. They pass those in as
// props so every feature — reactions, replies, link previews, order cards,
// the design opening bubble, the offline outbox — is written and fixed once.
//
// Keyboard: the composer rides above the keyboard via keyboard-controller's
// KeyboardAvoidingView (padding). It wraps only the list + composer so the
// header stays put. With android.softwareKeyboardLayoutMode = "pan" (app.json)
// the OS no longer also resizes the window, so the library owns the inset and
// the composer clears the IME suggestion strip too.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Message, MessageAttachment, MessageReaction } from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import { Text, useAtelierTheme, useFieldFocus } from '@seamflow/ui';
import { Screen } from '../Screen';
import { ScreenHeader } from '../ScreenHeader';
import { SkeletonList } from '../Skeleton';
import { useConversation, useMarkConversationRead, useMessages, useOrders } from '../../lib/queries';
import { useConsumerMeasurements } from '../../lib/consumer-queries';
import { useChatRealtime } from '../../lib/chat-realtime';
import {
  discard,
  enqueue,
  flush,
  pendingFor,
  retry,
  retryAll,
  subscribeOutbox,
  type PendingMessage,
} from '../../lib/chat-outbox';
import { pickPhotos, uploadChatImage } from '../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../lib/permissions';
import { useDialog } from '../../lib/dialog';
import { useOnline } from '../../lib/use-online';
import { qk } from '../../lib/query-keys';
import { api } from '../../lib/api';
import { spacing, radii, useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

const REACTION_CHOICES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const URL_RE = /(https?:\/\/[^\s]+)/i;

export interface ChatThreadProps {
  conversationId: string;
  role: 'tailor' | 'client';
  /** i18n namespace: 'chat' (tailor) or 'cchat' (client). */
  ns: 'chat' | 'cchat';
  /** Open an order (header link + order cards). */
  onViewOrder: (orderId: string) => void;
  /** Tailor only: go to the Create-quote screen. */
  onCreateQuote?: () => void;
}

type Bubble =
  | { kind: 'sent'; msg: Message }
  | { kind: 'pending'; pending: PendingMessage };
type Row = Bubble | { kind: 'day'; label: string; key: string };

export function ChatThread({ conversationId: id, role, ns, onViewOrder, onCreateQuote }: ChatThreadProps) {
  const { t } = useTranslation();
  const tk = (k: string, p?: Record<string, string | number>) => t(`${ns}.${k}`, p);
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  const composerFocus = useFieldFocus();
  const dialog = useDialog();
  const online = useOnline();
  const qc = useQueryClient();

  const convoQ = useConversation(id);
  const msgsQ = useMessages(id);
  const markRead = useMarkConversationRead(id);
  const conversation = convoQ.data?.conversation;

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  /** The message whose WhatsApp-style action overlay is open. */
  const [menu, setMenu] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Row>>(null);

  // ── Outbox ────────────────────────────────────────────────────────────────
  useEffect(() => {
    void pendingFor(id).then(setPending);
    return subscribeOutbox((all) => setPending(all.filter((m) => m.conversationId === id)));
  }, [id]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const { counterpartyTyping, counterpartyOnline, notifyTyping } = useChatRealtime(id, role, {
    onInsert: () => {
      void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
      void qc.invalidateQueries({ queryKey: qk.conversations() });
      void markRead.mutateAsync().catch(() => undefined);
    },
    onUpdate: () => {
      // read_at OR reactions/reply changed — refetch so the tick + pills update.
      void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
    },
  });

  useEffect(() => {
    if (!id) return;
    markRead.mutate(undefined, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (online) {
      void flush(() => {
        void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
        void qc.invalidateQueries({ queryKey: qk.conversations() });
      });
    }
  }, [online, id, qc]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const reactMut = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api.conversations.react(id, messageId, emoji),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) }),
  });
  const shareOrderMut = useMutation({
    mutationFn: (orderId: string) => api.conversations.shareOrder(id, { orderId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
      void qc.invalidateQueries({ queryKey: qk.conversations() });
    },
    onError: (err) => void dialog.error(err),
  });

  // ── Rows ────────────────────────────────────────────────────────────────
  const messages: Message[] = msgsQ.messages;

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const pendingRows: Row[] = [...pending]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({ kind: 'pending', pending: p }));
    out.push(...pendingRows);
    let lastDay: string | null = null;
    for (const m of messages) {
      const day = new Date(m.createdAt).toDateString();
      if (lastDay && day !== lastDay) {
        out.push({ kind: 'day', label: dayLabel(lastDay, t), key: `day-${lastDay}` });
      }
      out.push({ kind: 'sent', msg: m });
      lastDay = day;
    }
    if (lastDay) out.push({ kind: 'day', label: dayLabel(lastDay, t), key: `day-${lastDay}-end` });
    return out;
  }, [messages, pending, t]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const snippetOf = (m: Message): string =>
    m.body?.trim()
      ? m.body.trim().slice(0, 120)
      : m.attachments.some((a) => a.kind === 'image')
        ? '📷'
        : m.attachments.some((a) => a.kind === 'order')
          ? '📦'
          : m.attachments.some((a) => a.kind === 'measurement')
            ? '📏'
            : m.attachments.some((a) => a.kind === 'design')
              ? '🖼️'
              : '🔗';

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    const reply = replyingTo;
    setDraft('');
    setReplyingTo(null);
    await enqueue({
      conversationId: id,
      body,
      replyToId: reply?.id ?? null,
      replyPreview: reply
        ? { messageId: reply.id, side: reply.senderType, snippet: snippetOf(reply) }
        : null,
    });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    void flush(() => {
      void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
      void qc.invalidateQueries({ queryKey: qk.conversations() });
    });
  };

  const attach = async (source: 'camera' | 'library') => {
    setAttaching(true);
    try {
      const assets = await pickPhotos(source, 5);
      if (assets.length === 0) return;
      const attachments: MessageAttachment[] = [];
      for (const asset of assets) attachments.push(await uploadChatImage({ conversationId: id, asset }));
      await enqueue({ conversationId: id, attachments });
      void flush(() => void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) }));
    } catch (err) {
      if (!(await alertIfOffline(err, dialog, t)) && !(await alertIfPermissionDenied(err, dialog, t))) {
        await dialog.error(err);
      }
    } finally {
      setAttaching(false);
    }
  };

  const promptAttach = async () => {
    const actions = [
      { label: t(`${ns}.attachTakePhoto`), value: 'camera' as const },
      { label: t(`${ns}.attachFromGallery`), value: 'library' as const },
      ...(role === 'tailor' ? [{ label: tk('shareOrder'), value: 'order' as const }] : []),
      ...(role === 'client' ? [{ label: tk('shareMeasurements'), value: 'measurement' as const }] : []),
    ];
    const action = await dialog.choose<'camera' | 'library' | 'order' | 'measurement'>({
      title: tk('attach'),
      actions,
    });
    if (action === 'order') void pickOrderToShare();
    else if (action === 'measurement') void pickMeasurementToShare();
    else if (action) void attach(action);
  };

  // ── Share order (tailor) ──────────────────────────────────────────────────
  const ordersQ = useOrders();
  const pickOrderToShare = async () => {
    const list = ordersQ.data?.items ?? [];
    if (list.length === 0) {
      await dialog.alert({ title: tk('shareOrder'), message: tk('shareOrderEmpty'), tone: 'info' });
      return;
    }
    const chosen = await dialog.choose<string>({
      title: tk('shareOrderPick'),
      actions: list.slice(0, 30).map((o) => ({
        label: o.orderName,
        value: o.id,
      })),
    });
    if (chosen) shareOrderMut.mutate(chosen);
  };

  // ── Share measurements (client) ───────────────────────────────────────────
  const measurementsQ = useConsumerMeasurements();
  const pickMeasurementToShare = async () => {
    const list = measurementsQ.data?.items ?? [];
    if (list.length === 0) {
      await dialog.alert({
        title: tk('shareMeasurements'),
        message: tk('shareMeasurementsEmpty'),
        tone: 'info',
      });
      return;
    }
    const chosenId = await dialog.choose<string>({
      title: tk('shareMeasurementsPick'),
      actions: list.slice(0, 30).map((m) => ({
        label: m.label ?? tk('measurementMessage'),
        value: m.id,
      })),
    });
    if (!chosenId) return;
    const set = list.find((m) => m.id === chosenId);
    if (!set) return;
    await enqueue({
      conversationId: id,
      attachments: [
        {
          kind: 'measurement',
          label: set.label,
          values: set.values,
          unitPreference: set.unitPreference,
        },
      ],
    });
    void flush(() => void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) }));
  };

  // ── Reactions / reply overlay (WhatsApp-style) ────────────────────────────
  const onLongPressBubble = (msg: Message) => setMenu(msg);
  const react = (m: Message, emoji: string) => {
    reactMut.mutate({ messageId: m.id, emoji });
    setMenu(null);
  };
  const copyMessage = async (m: Message) => {
    if (m.body) await Clipboard.setStringAsync(m.body);
    setMenu(null);
  };

  const scrollToMessage = (messageId: string) => {
    const idx = rows.findIndex((r) => r.kind === 'sent' && r.msg.id === messageId);
    if (idx >= 0) {
      try {
        listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
      } catch {
        /* index may be unmeasured — best effort */
      }
    }
  };

  const anyFailed = pending.some((p) => p.status === 'failed');

  // ── Render one bubble ─────────────────────────────────────────────────────
  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.dayWrap}>
          <Text variant="caption" tone="textMuted">
            {item.label}
          </Text>
        </View>
      );
    }

    const isPending = item.kind === 'pending';
    const msg = item.kind === 'sent' ? item.msg : null;
    const mine = isPending ? true : msg!.senderType === role;
    const body = isPending ? item.pending.body : msg!.body;
    const attachments = isPending ? item.pending.attachments : msg!.attachments;
    const reactions: MessageReaction[] = msg?.reactions ?? [];
    const replyPreview = isPending ? item.pending.replyPreview : msg!.replyPreview;
    const failed = isPending && item.pending.status === 'failed';
    const bodyUrl = body?.match(URL_RE)?.[0] ?? null;

    return (
      <Pressable
        onPress={failed ? () => onFailedPress(item.pending) : undefined}
        onLongPress={msg ? () => onLongPressBubble(msg) : undefined}
        delayLongPress={280}
        style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirsRow]}
      >
        <View style={styles.bubbleCol}>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: mine ? atelier.primary : colors.card,
                borderRadius: radii.lg,
                opacity: isPending && !failed ? 0.7 : 1,
              },
            ]}
          >
            {/* Quoted reply */}
            {replyPreview ? (
              <Pressable
                onPress={() => scrollToMessage(replyPreview.messageId)}
                style={[styles.quote, { borderLeftColor: mine ? atelier.textOnPrimary : atelier.primary }]}
              >
                <Text
                  variant="caption"
                  numberOfLines={2}
                  style={{ color: mine ? atelier.textOnPrimary : colors.textMuted, opacity: 0.9 }}
                >
                  {replyPreview.snippet}
                </Text>
              </Pressable>
            ) : null}

            {attachments.map((a, i) => renderAttachment(a, i))}

            {body ? (
              <Text variant="body" style={{ color: mine ? atelier.textOnPrimary : colors.text }}>
                {linkify(body, mine ? atelier.textOnPrimary : atelier.primary)}
              </Text>
            ) : null}

            {/* Rich link preview for a pasted URL */}
            {bodyUrl ? <LinkPreviewCard url={bodyUrl} onOpen={openUrl} /> : null}

            <View style={styles.meta}>
              {isPending ? (
                <Text
                  variant="caption"
                  style={{ color: failed ? colors.danger : atelier.textOnPrimary }}
                >
                  {failed
                    ? `${tk('failedToSend')} · ${tk('tapToRetry')}`
                    : online
                      ? tk('sending')
                      : tk('queuedOffline')}
                </Text>
              ) : mine ? (
                <Text variant="caption" style={{ color: atelier.textOnPrimary }}>
                  {msg!.readAt ? tk('readReceipt') : tk('deliveredReceipt')}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Reaction pills */}
          {reactions.length > 0 ? (
            <View style={[styles.reactions, mine ? styles.reactionsMine : styles.reactionsTheirs]}>
              {groupReactions(reactions).map(({ emoji, count }) => (
                <Pressable
                  key={emoji}
                  onPress={() => msg && reactMut.mutate({ messageId: msg.id, emoji })}
                  style={[styles.reactionPill, { backgroundColor: colors.card, borderColor: colors.hairline }]}
                >
                  <Text variant="caption">{emoji}</Text>
                  {count > 1 ? (
                    <Text variant="caption" tone="textMuted">
                      {' '}
                      {count}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const renderAttachment = (a: MessageAttachment, i: number) => {
    if (a.kind === 'image') {
      return (
        <Image
          key={i}
          source={{ uri: a.thumbnailUrl ?? a.url }}
          style={[styles.attachment, { borderRadius: radii.md }]}
        />
      );
    }
    if (a.kind === 'design') {
      const uri = a.thumbnailUrl ?? a.imageUrl;
      return uri ? (
        <Image key={i} source={{ uri }} style={[styles.attachment, { borderRadius: radii.md }]} />
      ) : (
        <View key={i} style={styles.designChip}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" tone="textMuted">
            {tk('designMessage')}
          </Text>
        </View>
      );
    }
    if (a.kind === 'order') {
      return (
        <Pressable
          key={i}
          onPress={() => onViewOrder(a.orderId)}
          style={[styles.orderCard, { backgroundColor: colors.bg, borderColor: colors.hairline, borderRadius: radii.md }]}
        >
          <View style={[styles.orderIcon, { backgroundColor: colors.card, borderRadius: radii.sm }]}>
            {a.thumbnailUrl ? (
              <Image source={{ uri: a.thumbnailUrl }} style={styles.orderThumb} />
            ) : (
              <Ionicons name="shirt-outline" size={20} color={atelier.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" numberOfLines={1}>
              {a.orderName ?? tk('orderMessage')}
            </Text>
            <Text variant="caption" style={{ color: atelier.primary }}>
              {tk('viewOrder')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      );
    }
    if (a.kind === 'measurement') {
      const entries = Object.entries(a.values);
      return (
        <View
          key={i}
          style={[styles.measureCard, { backgroundColor: colors.bg, borderColor: colors.hairline, borderRadius: radii.md }]}
        >
          <View style={styles.measureHead}>
            <Ionicons name="body-outline" size={16} color={atelier.primary} />
            <Text variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
              {a.label || tk('measurementMessage')}
            </Text>
          </View>
          {entries.map(([k, v]) => (
            <View key={k} style={[styles.measureRow, { borderTopColor: colors.hairline }]}>
              <Text variant="caption" tone="textMuted" style={{ flex: 1 }}>
                {k}
              </Text>
              <Text variant="caption">{`${v} ${a.unitPreference}`}</Text>
            </View>
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={conversation?.counterparty.name ?? tk('threadTitle')}
          right={
            conversation?.orderId ? (
              <Pressable onPress={() => onViewOrder(conversation.orderId!)}>
                <Text variant="bodySm" style={{ color: atelier.primary }}>
                  {tk('viewOrder')}
                </Text>
              </Pressable>
            ) : onCreateQuote ? (
              <Pressable onPress={onCreateQuote}>
                <Text variant="bodySm" style={{ color: atelier.primary }}>
                  {tk('createQuote')}
                </Text>
              </Pressable>
            ) : null
          }
        />
        <Text variant="caption" tone="textMuted">
          {counterpartyTyping ? tk('typing') : counterpartyOnline ? tk('online') : ''}
        </Text>
      </View>

      {/* The design the enquiry is about, pinned so the tailor always sees it. */}
      {conversation?.design ? (
        <View style={[styles.pinned, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <Image
            source={{ uri: conversation.design.thumbnailUrl }}
            style={[styles.pinnedImg, { borderRadius: radii.sm }]}
          />
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="textMuted">
              {tk('aboutDesign')}
            </Text>
            <Text variant="bodySm" numberOfLines={1}>
              {conversation.design.title ??
                conversation.design.caption ??
                conversation.design.garmentType ??
                ''}
            </Text>
            {conversation.design.startingPrice ? (
              <Text variant="caption" tone="textMuted" numberOfLines={1}>
                {tk('designFromPrice', {
                  price: formatCurrency(
                    Number(conversation.design.startingPrice),
                    conversation.design.currency ?? 'XAF',
                  ),
                })}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!online ? (
        <View style={[styles.banner, { backgroundColor: colors.card }]}>
          <Text variant="caption" tone="textMuted">
            {tk('offlineBanner')}
          </Text>
        </View>
      ) : null}

      {anyFailed ? (
        <Pressable onPress={() => void retryAll(id)} style={[styles.banner, { backgroundColor: colors.card }]}>
          <Text variant="caption" style={{ color: colors.danger }}>
            {tk('retryAll')}
          </Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView style={styles.kav} behavior="padding" keyboardVerticalOffset={0}>
        {msgsQ.isLoading && messages.length === 0 ? (
          <View style={[styles.padded, styles.kav]}>
            <SkeletonList leading="none" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.kav}
            data={rows}
            inverted
            keyExtractor={(r) =>
              r.kind === 'day' ? r.key : r.kind === 'pending' ? r.pending.clientId : r.msg.id
            }
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReachedThreshold={0.4}
            onEndReached={msgsQ.loadOlder}
            ListFooterComponent={
              msgsQ.isLoadingOlder ? (
                <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.textMuted} />
              ) : !msgsQ.hasOlder && messages.length > 0 ? (
                <Text variant="caption" tone="textMuted" style={styles.startOf}>
                  {tk('startOfConversation')}
                </Text>
              ) : null
            }
          />
        )}

        {/* Reply banner */}
        {replyingTo ? (
          <View style={[styles.replyBar, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={[styles.replyAccent, { backgroundColor: atelier.primary }]} />
            <Text variant="caption" tone="textMuted" numberOfLines={1} style={{ flex: 1 }}>
              {tk('replyingBanner')} · {snippetOf(replyingTo)}
            </Text>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.card,
              borderColor: composerFocus.focused ? atelier.primary : colors.hairline,
            },
          ]}
        >
          <Pressable onPress={promptAttach} disabled={attaching} style={styles.attachBtn}>
            {attaching ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="add" size={24} color={colors.textMuted} />
            )}
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              notifyTyping();
            }}
            placeholder={tk('composerPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            {...composerFocus.focusProps}
            style={[styles.input, { color: colors.text }, composerFocus.webReset]}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            accessibilityLabel={tk('send')}
            style={[
              styles.sendBtn,
              { backgroundColor: draft.trim() ? atelier.primary : colors.border, borderRadius: radii.lg },
            ]}
          >
            <Ionicons name="send" size={18} color={atelier.textOnPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* WhatsApp-style long-press overlay: dim the thread, float the bubble in
          the middle with an emoji reaction bar above and an action menu below. */}
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        {menu
          ? (() => {
              const m = menu;
              const mine = m.senderType === role;
              const myEmoji = m.reactions.find((r) => r.side === role)?.emoji ?? null;
              return (
                <Pressable style={styles.overlayBackdrop} onPress={() => setMenu(null)}>
                  <View style={[styles.overlayCol, mine ? styles.overlayEnd : styles.overlayStart]}>
                    {/* Reaction bar */}
                    <View style={[styles.reactionBar, { backgroundColor: colors.card }]}>
                      {REACTION_CHOICES.map((e) => (
                        <Pressable
                          key={e}
                          onPress={() => react(m, e)}
                          style={[styles.reactionBtn, myEmoji === e && { backgroundColor: colors.bg }]}
                        >
                          <Text style={styles.reactionEmoji}>{e}</Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* The elevated bubble */}
                    <View
                      style={[
                        styles.overlayBubble,
                        { backgroundColor: mine ? atelier.primary : colors.card, borderRadius: radii.lg },
                      ]}
                    >
                      {m.attachments.map((a, i) => renderAttachment(a, i))}
                      {m.body ? (
                        <Text variant="body" style={{ color: mine ? atelier.textOnPrimary : colors.text }}>
                          {m.body}
                        </Text>
                      ) : null}
                    </View>

                    {/* Action menu */}
                    <View style={[styles.actionMenu, { backgroundColor: colors.card }]}>
                      <Pressable
                        style={styles.actionRow}
                        onPress={() => {
                          setReplyingTo(m);
                          setMenu(null);
                        }}
                      >
                        <Text variant="body">{tk('reply')}</Text>
                        <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                      </Pressable>
                      {m.body ? (
                        <View style={[styles.actionSep, { backgroundColor: colors.hairline }]} />
                      ) : null}
                      {m.body ? (
                        <Pressable style={styles.actionRow} onPress={() => copyMessage(m)}>
                          <Text variant="body">{tk('copy')}</Text>
                          <Ionicons name="copy-outline" size={20} color={colors.text} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })()
          : null}
      </Modal>
    </Screen>
  );

  function onFailedPress(p: PendingMessage) {
    void dialog
      .choose<'retry' | 'discard'>({
        title: tk('failedToSend'),
        actions: [
          { label: tk('retry'), value: 'retry' },
          { label: t('ccommon.delete'), value: 'discard', destructive: true },
        ],
      })
      .then((action) => {
        if (action === 'retry') void retry(p.clientId);
        if (action === 'discard') void discard(p.clientId);
      });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function openUrl(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

/** Split text into plain + tappable link spans. */
function linkify(text: string, linkColor: string): React.ReactNode {
  const parts = text.split(URL_RE);
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <Text key={i} style={{ color: linkColor, textDecorationLine: 'underline' }} onPress={() => openUrl(part)}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

function groupReactions(reactions: MessageReaction[]): { emoji: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of reactions) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }));
}

/** A rich preview card for a pasted URL — unfurled server-side, cached per URL. */
function LinkPreviewCard({ url, onOpen }: { url: string; onOpen: (u: string) => void }) {
  const colors = useThemeColors();
  const q = useQuery({
    queryKey: ['link-unfurl', url],
    queryFn: () => api.links.unfurl(url),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
  const p = q.data;
  if (!p || (!p.title && !p.imageUrl)) return null;
  return (
    <Pressable
      onPress={() => onOpen(url)}
      style={[styles.linkCard, { backgroundColor: colors.bg, borderColor: colors.hairline, borderRadius: radii.md }]}
    >
      {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.linkImg} /> : null}
      <View style={styles.linkBody}>
        {p.title ? (
          <Text variant="bodySm" numberOfLines={2}>
            {p.title}
          </Text>
        ) : null}
        {p.siteName ? (
          <Text variant="caption" tone="textMuted" numberOfLines={1}>
            {p.siteName}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function dayLabel(dateString: string, t: (k: string) => string): string {
  const d = new Date(dateString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return t('cchat.today');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t('cchat.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  kav: { flex: 1 },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  pinnedImg: { width: 40, height: 40 },
  banner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row' },
  bubbleCol: { maxWidth: '80%' },
  mineRow: { justifyContent: 'flex-end' },
  theirsRow: { justifyContent: 'flex-start' },
  bubble: { padding: spacing.md, gap: spacing.xs },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.sm, marginBottom: spacing.xs, opacity: 0.95 },
  attachment: { width: 180, height: 180, marginBottom: spacing.xs },
  designChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 220,
  },
  orderIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orderThumb: { width: 40, height: 40 },
  measureCard: { minWidth: 220, padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  measureHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  measureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, borderTopWidth: StyleSheet.hairlineWidth },
  meta: { alignItems: 'flex-end' },
  reactions: { flexDirection: 'row', gap: 4, marginTop: -6 },
  reactionsMine: { justifyContent: 'flex-end' },
  reactionsTheirs: { justifyContent: 'flex-start' },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // WhatsApp-style long-press overlay
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  overlayCol: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: spacing.sm },
  overlayStart: { alignItems: 'flex-start' },
  overlayEnd: { alignItems: 'flex-end' },
  reactionBar: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reactionBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 999 },
  reactionEmoji: { fontSize: 26 },
  overlayBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  actionMenu: {
    minWidth: 200,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionSep: { height: StyleSheet.hairlineWidth },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  linkImg: { width: 56, height: 56 },
  linkBody: { flex: 1, paddingVertical: spacing.xs, paddingRight: spacing.sm, gap: 2 },
  dayWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  startOf: { textAlign: 'center', marginVertical: spacing.md },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  replyAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { padding: spacing.sm },
  input: { flex: 1, maxHeight: 120, paddingVertical: spacing.sm, fontSize: 15 },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
