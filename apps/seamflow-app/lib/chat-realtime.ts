// ============================================================================
// Chat realtime — live messages, read receipts, typing, and presence.
//
// Three different transports, chosen per signal:
//
//   postgres_changes  messages INSERT/UPDATE. Durable data, so it comes from
//                     the database and is gated by the RLS policy on `messages`
//                     — a subscriber only ever receives rows that policy admits.
//   broadcast         typing. Worthless a second later, and a database write
//                     per keystroke would be a self-inflicted denial of service.
//   presence          online / last-seen. Ephemeral by definition.
//
// All three share one channel per conversation so opening a thread costs one
// websocket subscription, not three.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MessageSenderType } from '@seamflow/schemas';
import { supabase } from './supabase';

/** Stop announcing "typing" this long after the last keystroke. */
const TYPING_IDLE_MS = 3000;
/** Don't re-broadcast more often than this while someone types continuously. */
const TYPING_THROTTLE_MS = 1500;

export interface ChatRealtimeCallbacks {
  /** A row landed in `messages` for this conversation. */
  onInsert?: (row: Record<string, unknown>) => void;
  /** A row changed — in practice, read_at being stamped. */
  onUpdate?: (row: Record<string, unknown>) => void;
}

export interface ChatRealtimeState {
  /** The other party is typing right now. */
  counterpartyTyping: boolean;
  /** The other party has the thread open. */
  counterpartyOnline: boolean;
  /** Call on every keystroke; throttling and the idle timer are handled here. */
  notifyTyping: () => void;
}

/**
 * Subscribe to one conversation.
 *
 * `mySide` is needed because typing events echo back to the sender on a
 * broadcast channel — without it we'd show the tailor their own "typing…".
 */
export function useChatRealtime(
  conversationId: string | undefined,
  mySide: MessageSenderType,
  callbacks: ChatRealtimeCallbacks = {},
): ChatRealtimeState {
  const [counterpartyTyping, setCounterpartyTyping] = useState(false);
  const [counterpartyOnline, setCounterpartyOnline] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const typingClear = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks in a ref so re-renders don't tear down the subscription.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`conversation:${conversationId}`, {
      config: { presence: { key: mySide } },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => cbRef.current.onInsert?.(payload.new as Record<string, unknown>),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => cbRef.current.onUpdate?.(payload.new as Record<string, unknown>),
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { senderType?: MessageSenderType; isTyping?: boolean };
        // Ignore our own echo.
        if (!p?.senderType || p.senderType === mySide) return;
        setCounterpartyTyping(!!p.isTyping);
        if (typingClear.current) clearTimeout(typingClear.current);
        if (p.isTyping) {
          // Self-heal: if the other end goes away mid-type we'd otherwise show
          // "typing…" forever.
          typingClear.current = setTimeout(
            () => setCounterpartyTyping(false),
            TYPING_IDLE_MS + 1000,
          );
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setCounterpartyOnline(
          Object.keys(state).some((k) => k !== mySide && state[k]?.length),
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ side: mySide, at: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingClear.current) clearTimeout(typingClear.current);
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setCounterpartyTyping(false);
      setCounterpartyOnline(false);
    };
  }, [conversationId, mySide]);

  const notifyTyping = () => {
    const ch = channelRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderType: mySide, isTyping: true, at: now },
    });
    // Announce the stop too, so the other side isn't left waiting on a timeout.
    setTimeout(() => {
      if (Date.now() - lastTypingSent.current >= TYPING_IDLE_MS) {
        void ch.send({
          type: 'broadcast',
          event: 'typing',
          payload: { senderType: mySide, isTyping: false, at: Date.now() },
        });
      }
    }, TYPING_IDLE_MS);
  };

  return { counterpartyTyping, counterpartyOnline, notifyTyping };
}
