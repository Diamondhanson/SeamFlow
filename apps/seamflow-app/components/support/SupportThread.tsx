// ============================================================================
// Help & Support — one ticket as a conversation (plan step 1).
//
// Looks like chat on purpose — people already know how to use it — but it is
// its own small screen rather than <ChatThread>: a ticket has a status bar,
// no reactions or order cards, and "SeamFlow Support" on the other side
// instead of a tailor. Bending ChatThread to fit would thread a third role
// through a 1,000-line component that two other screens depend on.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import {
  formatTicketRef,
  type FeedImage,
  type SupportAttachment,
  type SupportMessage,
} from '@seamflow/schemas';
import { activeFontFamilies, Text, useAtelierTheme, useFieldFocus, withAlpha, useKeyboardAppearance } from '@seamflow/ui';
import { Screen } from '../Screen';
import { ScreenHeader } from '../ScreenHeader';
import { Button } from '../Button';
import { Skeleton, SkeletonLine } from '../Skeleton';
import { FullscreenGallery } from '../client/FullscreenGallery';
import { useAuth } from '../../lib/auth-context';
import {
  newSupportClientId,
  useReplySupportTicket,
  useResolveSupportTicket,
  useSupportTicket,
} from '../../lib/support-queries';
import { pickPhoto, uploadSupportImage } from '../../lib/photo-upload';
import { alertIfOffline, alertIfPermissionDenied } from '../../lib/permissions';
import { useDialog } from '../../lib/dialog';
import { radii, spacing } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';
import { SupportStatusChip } from './SupportStatusChip';
import { shortDate } from './SupportTicketList';

export function SupportThread({ id }: { id: string }) {
  const { t } = useTranslation();
  const { colors } = useAtelierTheme();
  const dialog = useDialog();
  const { session } = useAuth();
  const q = useSupportTicket(id);
  const reply = useReplySupportTicket(id);
  const resolve = useResolveSupportTicket(id);
  const composerFocus = useFieldFocus();
  const listRef = useRef<FlatList<SupportMessage>>(null);

  const [draft, setDraft] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [viewer, setViewer] = useState<{ images: FeedImage[]; index: number } | null>(null);

  const ticket = q.data?.ticket;
  const messages = useMemo(() => q.data?.messages ?? [], [q.data]);
  const keyboardAppearance = useKeyboardAppearance();

  const send = (attachments: SupportAttachment[] = []) => {
    const body = draft.trim();
    if (!body && attachments.length === 0) return;
    reply.mutate(
      { body: body || undefined, attachments, clientId: newSupportClientId() },
      {
        onSuccess: () => {
          setDraft('');
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        },
        onError: (err) => void dialog.error(err),
      },
    );
  };

  const attach = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const source = await dialog.choose<'camera' | 'library'>({
      title: t('support.addScreenshotTitle'),
      actions: [
        { label: t('support.chooseFromGallery'), value: 'library' },
        { label: t('support.takePhoto'), value: 'camera' },
      ],
    });
    if (!source) return;
    setAttaching(true);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;
      send([await uploadSupportImage({ userId, asset })]);
    } catch (err) {
      if (await alertIfOffline(err, dialog, t)) return;
      if (await alertIfPermissionDenied(err, dialog, t)) return;
      await dialog.error(err);
    } finally {
      setAttaching(false);
    }
  };

  const markResolved = async () => {
    const ok = await dialog.confirm({
      title: t('support.resolveConfirmTitle'),
      message: t('support.resolveConfirmBody'),
      confirmLabel: t('support.resolveConfirm'),
    });
    if (ok) resolve.mutate(undefined, { onError: (err) => void dialog.error(err) });
  };

  const openImages = (atts: SupportAttachment[], index: number) => {
    const images: FeedImage[] = atts
      .filter((a) => a.url)
      .map((a, position) => ({
        imageUrl: a.url!,
        thumbnailUrl: a.thumbnailUrl ?? a.url!,
        width: a.width ?? null,
        height: a.height ?? null,
        position,
      }));
    if (images.length) setViewer({ images, index });
  };

  if (!ticket) {
    return (
      <Screen>
        <ScreenHeader title={t('support.title')} />
        {q.isError ? (
          <View style={styles.center}>
            <Text variant="bodySm" tone="textMuted">
              {t('support.loadFailed')}
            </Text>
            <Button label={t('common.retry')} variant="secondary" onPress={() => void q.refetch()} />
          </View>
        ) : (
          <ThreadSkeleton />
        )}
      </Screen>
    );
  }

  const canSend = !!draft.trim() && !reply.isPending;

  return (
    <Screen>
      <ScreenHeader
        title={formatTicketRef(ticket.number)}
        subtitle={t(`support.category_${ticket.category}`)}
      />

      {/* Status bar — where the ticket stands and what (if anything) is
          expected of the user. */}
      <View
        style={[
          styles.statusBar,
          { backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: radii.md },
        ]}
      >
        <View style={styles.statusTop}>
          <SupportStatusChip status={ticket.status} />
          {ticket.status !== 'resolved' ? (
            <Pressable onPress={() => void markResolved()} hitSlop={8} accessibilityRole="button">
              <Text variant="bodySm" style={{ color: colors.primary, fontFamily: activeFontFamilies.bodySemibold }}>
                {t('support.markResolved')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text variant="bodySm" tone="textMuted">
          {t(`support.statusHint_${ticket.status}`)}
        </Text>
        {ticket.orderName ? (
          <Text variant="caption" tone="textMuted">
            {t('support.orderRef', { name: ticket.orderName })}
          </Text>
        ) : null}
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <Text variant="caption" tone="textMuted" style={styles.opened}>
              {t('support.openedOn', { date: new Date(ticket.createdAt).toLocaleDateString() })}
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.sender === 'user';
            return (
              <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                <View style={styles.col}>
                  {!mine ? (
                    <Text variant="caption" style={{ color: colors.primary, fontFamily: activeFontFamilies.bodySemibold }}>
                      {t('support.supportName')}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      {
                        borderRadius: radii.lg,
                        backgroundColor: mine ? colors.primary : colors.surface,
                        borderColor: colors.hairline,
                        borderWidth: mine ? 0 : 1,
                      },
                    ]}
                  >
                    {item.attachments.length ? (
                      <View style={styles.shots}>
                        {item.attachments.map((a, i) => (
                          <Pressable
                            key={a.storagePath}
                            onPress={() => openImages(item.attachments, i)}
                            accessibilityRole="imagebutton"
                            accessibilityLabel={t('support.photo')}
                          >
                            <Image
                              source={{ uri: a.thumbnailUrl ?? a.url }}
                              style={[styles.shot, { borderRadius: radii.md, backgroundColor: withAlpha(colors.text, 0.08) }]}
                            />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {item.body ? (
                      <Text variant="body" style={{ color: mine ? colors.textOnPrimary : colors.text }}>
                        {item.body}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" tone="textMuted" style={mine ? styles.metaMine : undefined}>
                    {shortDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { borderTopColor: colors.hairline, backgroundColor: colors.bg }]}>
          <Pressable
            onPress={() => void attach()}
            disabled={attaching}
            style={styles.attachBtn}
            accessibilityRole="button"
            accessibilityLabel={t('support.attach')}
          >
            {attaching ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            )}
          </Pressable>
          <TextInput
          keyboardAppearance={keyboardAppearance}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('support.replyPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            {...composerFocus.focusProps}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderRadius: radii.lg },
              composerFocus.webReset,
            ]}
          />
          <Pressable
            onPress={() => send()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel={t('support.sendReply')}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? colors.primary : colors.hairline, borderRadius: radii.lg },
            ]}
          >
            {reply.isPending ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="send" size={18} color={colors.textOnPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {viewer ? (
        <FullscreenGallery
          images={viewer.images}
          visible
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </Screen>
  );
}

/** Status bar + alternating bubbles — the loaded layout, at rest. */
function ThreadSkeleton() {
  return (
    <View style={styles.skel}>
      <Skeleton height={76} radius={radii.md} />
      <View style={[styles.skelBubble, styles.skelMine]}>
        <Skeleton width={220} height={64} radius={radii.lg} />
      </View>
      <View style={styles.skelBubble}>
        <SkeletonLine width={90} />
        <Skeleton width={240} height={48} radius={radii.lg} />
      </View>
      <View style={[styles.skelBubble, styles.skelMine]}>
        <Skeleton width={160} height={40} radius={radii.lg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.md },
  statusBar: { borderWidth: 1, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kav: { flex: 1 },
  list: { paddingVertical: spacing.md, gap: spacing.md },
  opened: { textAlign: 'center', marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  col: { maxWidth: '82%', gap: 4 },
  bubble: { padding: spacing.md, gap: spacing.sm },
  shots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  shot: { width: 120, height: 120 },
  metaMine: { textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { height: 40, justifyContent: 'center', paddingHorizontal: 4 },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  sendBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  skel: { gap: spacing.lg, paddingTop: spacing.sm },
  skelBubble: { gap: spacing.xs, alignItems: 'flex-start' },
  skelMine: { alignItems: 'flex-end' },
});
