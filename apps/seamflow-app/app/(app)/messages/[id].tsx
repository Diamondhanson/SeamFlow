// ============================================================================
// One conversation (ROADMAP D.4.3).
//
// Everything that makes chat feel instant rather than merely functional lives
// here, and each piece is doing real work:
//
//   optimistic send   the bubble appears before the network is touched, from
//                     the outbox — so it survives a force-quit too
//   per-message state sending / failed, with tap-to-retry. A message that
//                     silently vanished would be worse than one marked failed
//   read receipts     driven by Realtime UPDATE on read_at
//   typing + presence broadcast + presence on the same channel
//   attachments       compressed and uploaded to the PRIVATE chat-media bucket
//   infinite history  keyset pagination, oldest fetched on scroll-to-top
//
// The list is inverted: newest at the bottom, which is what every messaging app
// does and what makes "scroll up for history" natural.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Message, MessageAttachment } from '@seamflow/schemas';
import { formatCurrency } from '@seamflow/utils';
import { Text, useAtelierTheme, useFieldFocus } from '@seamflow/ui';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonList } from '../../../components/Skeleton';
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
} from '../../../lib/queries';
import { useChatRealtime } from '../../../lib/chat-realtime';
import {
  discard,
  enqueue,
  flush,
  pendingFor,
  retry,
  retryAll,
  subscribeOutbox,
  type PendingMessage,
} from '../../../lib/chat-outbox';
import { pickPhotos, uploadChatImage } from '../../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../../lib/permissions';
import { useDialog } from '../../../lib/dialog';
import { useOnline } from '../../../lib/use-online';
import { qk } from '../../../lib/query-keys';
import { spacing, radii, useThemeColors } from '../../../lib/theme';
import { useTranslation } from '../../../lib/i18n';

/** A real message, or one still in the outbox. */
type Bubble =
  | { kind: 'sent'; msg: Message }
  | { kind: 'pending'; pending: PendingMessage };

/** Inserted between bubbles from different days. */
type Row = Bubble | { kind: 'day'; label: string; key: string };

export default function Thread() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { colors: atelier } = useAtelierTheme();
  // The composer's top hairline doubles as its focus indicator, so the
  // browser's own ring can be suppressed on web (see useFieldFocus).
  const composerFocus = useFieldFocus();
  const dialog = useDialog();
  const online = useOnline();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const convoQ = useConversation(id);
  const msgsQ = useMessages(id);
  const markRead = useMarkConversationRead(id);
  const conversation = convoQ.data?.conversation;

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [attaching, setAttaching] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);

  // ── Outbox ────────────────────────────────────────────────────────────────
  useEffect(() => {
    void pendingFor(id).then(setPending);
    return subscribeOutbox((all) =>
      setPending(all.filter((m) => m.conversationId === id)),
    );
  }, [id]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const { counterpartyTyping, counterpartyOnline, notifyTyping } = useChatRealtime(
    id,
    'tailor',
    {
      onInsert: () => {
        // Refetch rather than splicing the raw row in: the API adds signed
        // attachment URLs that the database payload doesn't carry.
        void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
        void qc.invalidateQueries({ queryKey: qk.conversations() });
        void markRead.mutateAsync().catch(() => undefined);
      },
      onUpdate: () => {
        // read_at landed — refresh so the receipt tick updates.
        void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
      },
    },
  );

  // Opening a thread clears its unread count.
  useEffect(() => {
    if (!id) return;
    markRead.mutate(undefined, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Flush anything queued from a previous session as soon as we're back.
  useEffect(() => {
    if (online) {
      void flush(() => {
        void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
        void qc.invalidateQueries({ queryKey: qk.conversations() });
      });
    }
  }, [online, id, qc]);

  // ── Rows ──────────────────────────────────────────────────────────────────
  const messages: Message[] = useMemo(
    () => (msgsQ.data?.pages ?? []).flatMap((p) => p.items),
    [msgsQ.data],
  );

  const rows: Row[] = useMemo(() => {
    // Newest first, matching the inverted list. Pending messages are always
    // newest, so they lead.
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
    if (lastDay) {
      out.push({ kind: 'day', label: dayLabel(lastDay, t), key: `day-${lastDay}-end` });
    }
    return out;
  }, [messages, pending, t]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await enqueue({ conversationId: id, body });
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
      for (const asset of assets) {
        attachments.push(await uploadChatImage({ conversationId: id, asset }));
      }
      await enqueue({ conversationId: id, attachments });
      void flush(() => {
        void qc.invalidateQueries({ queryKey: qk.conversationMessages(id) });
      });
    } catch (err) {
      if (
        !(await alertIfOffline(err, dialog, t)) &&
        !(await alertIfPermissionDenied(err, dialog, t))
      ) {
        await dialog.error(err);
      }
    } finally {
      setAttaching(false);
    }
  };

  const promptAttach = async () => {
    const action = await dialog.choose<'camera' | 'library'>({
      title: t('chat.attach'),
      actions: [
        { label: t('chat.attachTakePhoto'), value: 'camera' },
        { label: t('chat.attachFromGallery'), value: 'library' },
      ],
    });
    if (action) attach(action);
  };

  const onFailedPress = async (p: PendingMessage) => {
    const action = await dialog.choose<'retry' | 'discard'>({
      title: t('chat.failedToSend'),
      actions: [
        { label: t('chat.retry'), value: 'retry' },
        { label: t('common.delete'), value: 'discard', destructive: true },
      ],
    });
    if (action === 'retry') void retry(p.clientId);
    if (action === 'discard') void discard(p.clientId);
  };

  const anyFailed = pending.some((p) => p.status === 'failed');

  // ── Render ────────────────────────────────────────────────────────────────
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

    const mine =
      item.kind === 'pending' ? true : item.msg.senderType === 'tailor';
    const body = item.kind === 'pending' ? item.pending.body : item.msg.body;
    const attachments =
      item.kind === 'pending' ? item.pending.attachments : item.msg.attachments;
    const failed = item.kind === 'pending' && item.pending.status === 'failed';

    return (
      <Pressable
        onPress={failed ? () => onFailedPress((item as { pending: PendingMessage }).pending) : undefined}
        style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirsRow]}
      >
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? atelier.primary : colors.card,
              borderRadius: radii.lg,
              opacity: item.kind === 'pending' && !failed ? 0.7 : 1,
            },
          ]}
        >
          {attachments.map((a, i) =>
            a.kind === 'image' ? (
              <Image
                key={i}
                source={{ uri: a.thumbnailUrl ?? a.url }}
                style={[styles.attachment, { borderRadius: radii.md }]}
              />
            ) : (
              <View key={i} style={styles.designChip}>
                <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
                <Text variant="caption" tone="textMuted">
                  {t('chat.designMessage')}
                </Text>
              </View>
            ),
          )}
          {body ? (
            <Text
              variant="body"
              style={{ color: mine ? atelier.textOnPrimary : colors.text }}
            >
              {body}
            </Text>
          ) : null}

          <View style={styles.meta}>
            {item.kind === 'pending' ? (
              <Text
                variant="caption"
                style={{ color: failed ? colors.danger : atelier.textOnPrimary }}
              >
                {failed
                  ? `${t('chat.failedToSend')} · ${t('chat.tapToRetry')}`
                  : online
                    ? t('chat.sending')
                    : t('chat.queuedOffline')}
              </Text>
            ) : mine ? (
              <Text variant="caption" style={{ color: atelier.textOnPrimary }}>
                {item.msg.readAt ? t('chat.readReceipt') : t('chat.deliveredReceipt')}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      <View style={styles.padded}>
        <ScreenHeader
          title={conversation?.counterparty.name ?? t('chat.threadTitle')}
          right={
            conversation?.orderId ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(app)/orders/[id]',
                    params: { id: conversation.orderId! },
                  })
                }
              >
                <Text variant="bodySm" style={{ color: atelier.primary }}>
                  {t('chat.viewOrder')}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/(app)/messages/quote', params: { id } })
                }
              >
                <Text variant="bodySm" style={{ color: atelier.primary }}>
                  {t('chat.createQuote')}
                </Text>
              </Pressable>
            )
          }
        />
        {/* Presence / typing line, directly under the name like every chat app. */}
        <Text variant="caption" tone="textMuted">
          {counterpartyTyping
            ? t('chat.typing')
            : counterpartyOnline
              ? t('chat.online')
              : ''}
        </Text>
      </View>

      {/* The design the enquiry is about, pinned so context never scrolls away. */}
      {conversation?.design ? (
        <View style={[styles.pinned, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <Image
            source={{ uri: conversation.design.thumbnailUrl }}
            style={[styles.pinnedImg, { borderRadius: radii.sm }]}
          />
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="textMuted">
              {t('chat.aboutDesign')}
            </Text>
            {/* Name first. `caption` is the long description and predates
                designs having names — it wraps badly on one line and buries
                the thing the tailor is actually trying to recognise. */}
            <Text variant="bodySm" numberOfLines={1}>
              {conversation.design.title ??
                conversation.design.caption ??
                conversation.design.garmentType ??
                ''}
            </Text>
            {conversation.design.startingPrice ? (
              <Text variant="caption" tone="textMuted" numberOfLines={1}>
                {t('chat.designFromPrice', {
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
            {t('chat.offlineBanner')}
          </Text>
        </View>
      ) : null}

      {anyFailed ? (
        <Pressable
          onPress={() => void retryAll(id)}
          style={[styles.banner, { backgroundColor: colors.card }]}
        >
          <Text variant="caption" style={{ color: colors.danger }}>
            {t('chat.retryAll')}
          </Text>
        </Pressable>
      ) : null}

      {msgsQ.isLoading && messages.length === 0 ? (
        <View style={styles.padded}>
          <SkeletonList leading="none" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          inverted
          keyExtractor={(r) =>
            r.kind === 'day' ? r.key : r.kind === 'pending' ? r.pending.clientId : r.msg.id
          }
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            // Inverted list: "end" is the TOP, i.e. older history.
            if (msgsQ.hasNextPage && !msgsQ.isFetchingNextPage) msgsQ.fetchNextPage();
          }}
          ListFooterComponent={
            msgsQ.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.textMuted} />
            ) : !msgsQ.hasNextPage && messages.length > 0 ? (
              <Text variant="caption" tone="textMuted" style={styles.startOf}>
                {t('chat.startOfConversation')}
              </Text>
            ) : null
          }
        />
      )}

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
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          )}
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={(v) => {
            setDraft(v);
            notifyTyping();
          }}
          placeholder={t('chat.composerPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          {...composerFocus.focusProps}
          style={[styles.input, { color: colors.text }, composerFocus.webReset]}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityLabel={t('chat.send')}
          style={[
            styles.sendBtn,
            {
              backgroundColor: draft.trim() ? atelier.primary : colors.border,
              borderRadius: radii.lg,
            },
          ]}
        >
          <Ionicons name="send" size={18} color={atelier.textOnPrimary} />
        </Pressable>
      </View>
    </Screen>
  );
}

function dayLabel(dateString: string, t: (k: string) => string): string {
  const d = new Date(dateString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return t('chat.today');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t('chat.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
  mineRow: { justifyContent: 'flex-end' },
  theirsRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: spacing.md, gap: spacing.xs },
  attachment: { width: 180, height: 180, marginBottom: spacing.xs },
  designChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { alignItems: 'flex-end' },
  dayWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  startOf: { textAlign: 'center', marginVertical: spacing.md },
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
