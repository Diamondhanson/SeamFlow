// ============================================================================
// Chat store — a copy of each conversation kept on the device (plan step 3).
//
// The server is the record; this is the fast, offline copy. It is what makes
// a thread open instantly, read with no signal, and sync by downloading only
// what changed since the last look.
//
// WHY NOT THE GENERAL QUERY CACHE
// Everything else the app caches is persisted as ONE AsyncStorage entry. On
// Android a single entry over ~2 MB cannot be read back at all, so a growing
// chat history would eventually take every cached order and client down with
// it. Chats therefore live here, one entry per conversation, capped, and are
// excluded from that blob (see app/_layout.tsx).
//
// SHAPE OF A SYNC
//   first open      newest page (30) → saved, with the server's `syncedAt`
//   every open      GET ?since=syncedAt → only new or changed messages
//                   (reactions and read ticks included — messages.updated_at
//                   moves on any change) → merged by id → saved
//   old photo links re-fetched in one call when older than LINK_REFRESH_MS;
//                   the server signs them for an hour
//   too much        the server answers `reset` → start again from newest page
//
// PRIVACY
// Keys carry the signed-in user's id, so one person's chats are never read
// under another's session, and signing out deletes them from the device.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message, MessagePage } from '@seamflow/schemas';
import { api } from './api';
import { supabase } from './supabase';
import { isWeb } from './platform-capabilities';

const PREFIX = 'seamflow:chat:v1';
/** Newest messages kept per thread on disk. Older ones stay a scroll away. */
const MAX_STORED_MESSAGES = 300;
/** Threads kept on disk, least recently opened dropped first. The web gets
 *  fewer: browsers cap an origin's storage at ~5 MB. */
const MAX_THREADS = isWeb ? 20 : 60;
/** Server links to chat photos last an hour; refresh a little before. */
const LINK_REFRESH_MS = 45 * 60 * 1000;
/** Most messages whose links are refreshed in one call (API limit: 200). */
const LINK_REFRESH_BATCH = 200;

export interface ChatThreadData {
  /** Newest first — the order the inverted chat list renders. */
  items: Message[];
  /** More history exists on the server than we hold. */
  hasOlder: boolean;
  /** Server time of the last sync; the `since` for the next one. */
  syncedAt: string | null;
  /** When the photo links in `items` were last signed (ms). */
  linksAt: number;
}

interface IndexEntry {
  id: string;
  at: number;
}

export function isThreadData(v: unknown): v is ChatThreadData {
  return !!v && typeof v === 'object' && Array.isArray((v as ChatThreadData).items);
}

async function userId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

const threadKey = (uid: string, id: string) => `${PREFIX}:${uid}:t:${id}`;
const indexKey = (uid: string) => `${PREFIX}:${uid}:index`;

// ── Disk ────────────────────────────────────────────────────────────────────

export async function loadThread(id: string): Promise<ChatThreadData | null> {
  const uid = await userId();
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(threadKey(uid, id));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isThreadData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveThread(id: string, thread: ChatThreadData): Promise<void> {
  const uid = await userId();
  if (!uid) return;
  const trimmed =
    thread.items.length > MAX_STORED_MESSAGES
      ? { ...thread, items: thread.items.slice(0, MAX_STORED_MESSAGES), hasOlder: true }
      : thread;
  try {
    await AsyncStorage.setItem(threadKey(uid, id), JSON.stringify(trimmed));
    await touchIndex(uid, id);
  } catch {
    // Full disk / quota: the thread still works from memory and the server.
  }
}

async function touchIndex(uid: string, id: string): Promise<void> {
  let index: IndexEntry[] = [];
  try {
    const raw = await AsyncStorage.getItem(indexKey(uid));
    if (raw) index = JSON.parse(raw) as IndexEntry[];
  } catch {
    index = [];
  }
  index = [{ id, at: Date.now() }, ...index.filter((e) => e.id !== id)];
  const evicted = index.slice(MAX_THREADS);
  index = index.slice(0, MAX_THREADS);
  await AsyncStorage.setItem(indexKey(uid), JSON.stringify(index));
  if (evicted.length) await AsyncStorage.multiRemove(evicted.map((e) => threadKey(uid, e.id)));
}

export async function forgetThread(id: string): Promise<void> {
  const uid = await userId();
  if (uid) await AsyncStorage.removeItem(threadKey(uid, id)).catch(() => undefined);
}

/** Remove every stored chat from this device — all users. Called on sign-out. */
export async function clearChatStore(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(`${PREFIX}:`));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    /* nothing stored, or storage unavailable */
  }
}

// Signing out must not leave anyone's conversations on a shared phone.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') void clearChatStore();
});

// ── Merge ───────────────────────────────────────────────────────────────────

/** Newest first; a later copy of a message replaces the earlier one. */
function merge(base: Message[], incoming: Message[]): Message[] {
  const byId = new Map(base.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) =>
    a.createdAt === b.createdAt ? b.id.localeCompare(a.id) : b.createdAt.localeCompare(a.createdAt),
  );
}

/** The server's cursor format: base64url of `${createdAt}|${id}`. */
function cursorFor(m: Message): string {
  return btoa(`${m.createdAt}|${m.id}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hasSignedLinks(m: Message): boolean {
  return m.attachments.some((a) => a.kind === 'image' || (a.kind === 'order' && !!a.thumbnailUrl));
}

function status(err: unknown): number | null {
  return err && typeof err === 'object' && 'status' in err && typeof err.status === 'number'
    ? err.status
    : null;
}

// ── Sync ────────────────────────────────────────────────────────────────────

async function freshThread(id: string): Promise<ChatThreadData> {
  const page: MessagePage = await api.conversations.messages(id);
  return {
    items: page.items,
    hasOlder: !!page.nextCursor,
    syncedAt: page.syncedAt ?? null,
    linksAt: Date.now(),
  };
}

/**
 * Bring a thread up to date: whatever is in memory, else whatever is on disk,
 * plus only what changed on the server since. Saves and returns the result.
 */
export async function syncThread(id: string, current: unknown): Promise<ChatThreadData> {
  const local = isThreadData(current) ? current : await loadThread(id);
  try {
    let thread: ChatThreadData;
    if (local?.syncedAt) {
      const delta = await api.conversations.messages(id, { since: local.syncedAt });
      thread = delta.reset
        ? await freshThread(id)
        : {
            ...local,
            items: merge(local.items, delta.items),
            syncedAt: delta.syncedAt ?? local.syncedAt,
          };
    } else {
      thread = await freshThread(id);
    }

    if (Date.now() - thread.linksAt > LINK_REFRESH_MS) {
      const ids = thread.items.filter(hasSignedLinks).slice(0, LINK_REFRESH_BATCH).map((m) => m.id);
      if (ids.length) {
        const { items } = await api.conversations.hydrate(id, ids);
        thread = { ...thread, items: merge(thread.items, items) };
      }
      thread = { ...thread, linksAt: Date.now() };
    }

    await saveThread(id, thread);
    return thread;
  } catch (err) {
    // Gone, or no longer ours (the other party deleted their account, say):
    // the local copy must not outlive the server's.
    const s = status(err);
    if (s === 404 || s === 403) await forgetThread(id);
    throw err;
  }
}

/** Fetch the page before the oldest message held. Kept in memory; disk keeps the newest. */
export async function loadOlder(id: string, thread: ChatThreadData): Promise<ChatThreadData> {
  const oldest = thread.items[thread.items.length - 1];
  if (!oldest) return thread;
  const page = await api.conversations.messages(id, { cursor: cursorFor(oldest) });
  const next = { ...thread, items: merge(thread.items, page.items), hasOlder: !!page.nextCursor };
  await saveThread(id, next);
  return next;
}
