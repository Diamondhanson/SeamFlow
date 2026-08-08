// ============================================================================
// Chat outbox — optimistic send, retry, and the offline queue.
//
// The problem this solves: a message must appear the instant you hit send, must
// survive the app being killed before it reaches the server, and must never
// arrive twice no matter how many times we retry.
//
// How:
//   - Every message gets a `clientId` minted HERE, before the request leaves
//     the device. The server de-duplicates on (conversationId, clientId) behind
//     a unique index, so a retry after a timeout returns the original message
//     rather than posting a second copy. That is what makes flushing the queue
//     blindly safe.
//   - Pending messages live in AsyncStorage, so a crash or force-quit mid-send
//     doesn't lose what you typed.
//   - The queue drains automatically when connectivity returns.
//
// Ordering: entries are kept in insertion order and flushed strictly
// sequentially. Firing them in parallel would let message 3 land before
// message 1 on a flaky connection, which reads as scrambled to both people.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import type { Message, MessageAttachment } from '@seamflow/schemas';
import { api } from './api';

const KEY = 'seamflow.chat.outbox.v1';

/** How many times we retry before parking a message as "failed". */
const MAX_ATTEMPTS = 5;

export interface PendingMessage {
  clientId: string;
  conversationId: string;
  body: string | null;
  attachments: MessageAttachment[];
  /** Local timestamp so optimistic bubbles sort correctly against real ones. */
  createdAt: string;
  attempts: number;
  /** 'sending' = in flight or queued; 'failed' = gave up, user can retry. */
  status: 'sending' | 'failed';
}

type Listener = (items: PendingMessage[]) => void;

let cache: PendingMessage[] | null = null;
const listeners = new Set<Listener>();
let flushing = false;

function emit() {
  const snapshot = cache ?? [];
  listeners.forEach((l) => l(snapshot));
}

async function load(): Promise<PendingMessage[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingMessage[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache ?? []));
  } catch {
    // Best-effort. The in-memory queue still works for this session.
  }
}

export function subscribeOutbox(fn: Listener): () => void {
  listeners.add(fn);
  void load().then(emit);
  return () => listeners.delete(fn);
}

export async function pendingFor(conversationId: string): Promise<PendingMessage[]> {
  const all = await load();
  return all.filter((m) => m.conversationId === conversationId);
}

/** Mint an id that's unique per device without needing crypto on every platform. */
function newClientId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Queue a message and start draining. Returns the pending entry so the UI can
 * render its optimistic bubble immediately — the caller does NOT await the
 * network.
 */
export async function enqueue(args: {
  conversationId: string;
  body?: string | null;
  attachments?: MessageAttachment[];
}): Promise<PendingMessage> {
  const all = await load();
  const entry: PendingMessage = {
    clientId: newClientId(),
    conversationId: args.conversationId,
    body: args.body?.trim() ? args.body.trim() : null,
    attachments: args.attachments ?? [],
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'sending',
  };
  all.push(entry);
  cache = all;
  await persist();
  emit();
  void flush();
  return entry;
}

/** Put a failed message back in the queue. */
export async function retry(clientId: string): Promise<void> {
  const all = await load();
  const entry = all.find((m) => m.clientId === clientId);
  if (!entry) return;
  entry.status = 'sending';
  entry.attempts = 0;
  await persist();
  emit();
  void flush();
}

export async function retryAll(conversationId: string): Promise<void> {
  const all = await load();
  for (const m of all) {
    if (m.conversationId === conversationId && m.status === 'failed') {
      m.status = 'sending';
      m.attempts = 0;
    }
  }
  await persist();
  emit();
  void flush();
}

export async function discard(clientId: string): Promise<void> {
  const all = await load();
  cache = all.filter((m) => m.clientId !== clientId);
  await persist();
  emit();
}

/**
 * Drain the queue, oldest first, one at a time.
 *
 * `onSent` lets the screen fold the confirmed message into its cache the moment
 * it lands, rather than waiting for a refetch.
 */
export async function flush(onSent?: (msg: Message) => void): Promise<void> {
  if (flushing) return;
  if (!onlineManager.isOnline()) return;
  flushing = true;
  try {
    // Re-read each pass: the user may have queued more while we were sending.
    for (;;) {
      const all = await load();
      const next = all.find((m) => m.status === 'sending');
      if (!next) break;

      try {
        const sent = await api.conversations.sendMessage(next.conversationId, {
          body: next.body,
          attachments: next.attachments,
          clientId: next.clientId,
        });
        cache = (cache ?? []).filter((m) => m.clientId !== next.clientId);
        await persist();
        emit();
        onSent?.(sent);
      } catch {
        next.attempts += 1;
        if (next.attempts >= MAX_ATTEMPTS) {
          next.status = 'failed';
        }
        await persist();
        emit();
        // Stop the pass on failure. Continuing would reorder messages, and if
        // we're offline the next attempt would fail identically anyway.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Drain automatically whenever connectivity returns. Registered once at app
 * start (see app/_layout.tsx) so a queue left over from a previous session
 * flushes without the user opening the thread.
 */
export function installOutboxFlusher(): () => void {
  const unsub = onlineManager.subscribe((online) => {
    if (online) void flush();
  });
  void flush();
  return unsub;
}
