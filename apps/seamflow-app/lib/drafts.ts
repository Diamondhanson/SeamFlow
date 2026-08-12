// ============================================================================
// Unsaved-work rescue.
//
// A tailor stands in front of a client, measures them, and taps out seventeen
// numbers. If anything interrupts that — the app is swiped away, the browser
// tab is evicted, the phone rings and Android reclaims the memory — every one
// of those numbers is gone and the client has to be measured again. That has
// already happened to a real person using this app, which is why this file
// exists.
//
// THE RULE: WRITE ON EVERY KEYSTROKE. Not debounced, not on a timer, not on a
// "component unmounting" cleanup.
//
// The temptation to debounce is strong and it is wrong here. On mobile the web
// app gets NO reliable warning before it dies: `beforeunload` and `unload` do
// not fire dependably when Android kills a backgrounded tab, and no browser
// will show a confirmation dialog for a swipe-away. React Native is the same
// story when the OS reclaims a background app. There is no "flush before we
// go" moment to hook, so the only safe assumption is that the process can
// vanish between one keystroke and the next — which makes any debounce window
// exactly the size of the data you are willing to lose.
//
// These writes are cheap enough that this costs nothing worth measuring: a few
// hundred bytes of JSON into localStorage (web) or a native key-value store,
// each one smaller than a single analytics ping.
//
// WHY LOCAL AND NOT THE SERVER. Autosaving to the API sounds safer and is not:
// it needs a network, and the moment that matters most is the one where a
// tailor is in someone's front room on a bad connection. Local storage is
// instant, works entirely offline, and cannot half-fail. The draft syncs to the
// server the usual way — when they press Save.
//
// Drafts are invisible until restored. Nothing half-finished ever appears in
// the tailor's real order list.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDialog } from './dialog';
import { useTranslation } from './i18n';

/** Bumped only if the envelope shape changes; old drafts are then discarded. */
const VERSION = 1;
const PREFIX = `seamflow.draft.v${VERSION}:`;

/**
 * Drafts older than this are not offered.
 *
 * A fortnight-old half-finished order is not a rescue, it is a confusing
 * question about a client the tailor has long since dealt with. Two days
 * comfortably covers "I was interrupted and came back tomorrow".
 */
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

interface Envelope<T> {
  v: number;
  savedAt: number;
  data: T;
}

/** Build a namespaced key. `null` parts mean "not ready" — see `useDraft`. */
export function draftKey(...parts: (string | null | undefined)[]): string | null {
  if (parts.some((p) => p === null || p === undefined || p === '')) return null;
  return PREFIX + parts.join(':');
}

export async function loadDraft<T>(key: string): Promise<{ data: T; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env.v !== VERSION) return null;
    if (Date.now() - env.savedAt > MAX_AGE_MS) {
      void AsyncStorage.removeItem(key);
      return null;
    }
    return { data: env.data, savedAt: env.savedAt };
  } catch {
    // A corrupt draft must never block the screen it belongs to.
    return null;
  }
}

/**
 * Fire-and-forget write. Deliberately not awaited by callers: the value is
 * handed to the storage layer in the same tick as the keystroke, and waiting
 * on the promise would only delay the next render.
 */
export function saveDraft<T>(key: string, data: T): void {
  const env: Envelope<T> = { v: VERSION, savedAt: Date.now(), data };
  try {
    void AsyncStorage.setItem(key, JSON.stringify(env)).catch(() => {});
  } catch {
    // Storage full or unavailable (Safari private mode). Losing the safety net
    // is bad; taking the screen down with it would be worse.
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

/**
 * Ask the browser not to evict this storage when the device runs low on space.
 *
 * Best-effort and silent: Chrome grants it based on engagement heuristics
 * rather than asking, and every other platform either has no such concept or
 * already treats app storage as durable.
 */
export function requestDurableStorage(): void {
  if (Platform.OS !== 'web') return;
  const storage = (globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } })
    .navigator?.storage;
  void storage?.persist?.().catch(() => {});
}

// ---------------------------------------------------------------------------

/** How long ago, in words, for the resume prompt. */
function agoLabel(savedAt: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  const mins = Math.max(1, Math.round((Date.now() - savedAt) / 60_000));
  if (mins < 60) return mins === 1 ? t('drafts.agoMinute') : t('drafts.agoMinutes', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? t('drafts.agoHour') : t('drafts.agoHours', { count: hours });
  const days = Math.round(hours / 24);
  return days === 1 ? t('drafts.agoDay') : t('drafts.agoDays', { count: days });
}

export interface UseDraftOptions<T> {
  /**
   * Storage key, or `null` to stand down entirely — use this while the screen
   * is still working out what it is editing. Nothing is read or written until
   * a real key arrives.
   */
  key: string | null;
  /** The current form state. Compared by value, so inline objects are fine. */
  value: T;
  /**
   * Is there anything here worth rescuing? Guards against offering to restore
   * an empty form, which is worse than useless — it implies work was saved
   * when there was none.
   */
  hasContent: (value: T) => boolean;
  /** Put a restored draft back into the screen's state. */
  onRestore: (value: T) => void;
  /**
   * Names the work in the prompt, e.g. the client being measured.
   *
   * Reads the SAVED draft, not the screen's current state — at the moment the
   * prompt is shown the screen is still empty, so anything derived from live
   * state would always be blank and the prompt would fall back to the anonymous
   * "you had unsaved work". The name is the whole reassurance.
   */
  describe?: (saved: T) => string | null;
  /**
   * Skip the restore prompt but keep saving. For screens that arrive
   * pre-filled from somewhere else (duplicating an order), where a prompt
   * would fight with the seed data.
   */
  skipRestore?: boolean;
}

export interface DraftHandle {
  /** True until the restore question has been answered. */
  restoring: boolean;
  /** Call after a successful save so the draft stops being offered. */
  clear: () => void;
}

/**
 * Keep a form's state on the device, and offer it back after an interruption.
 *
 * Autosaving does not begin until the restore question is settled. Writing
 * sooner would let the screen's empty initial state overwrite the very draft
 * being restored — the bug that makes naive autosave worse than none at all.
 */
export function useDraft<T>({
  key,
  value,
  hasContent,
  onRestore,
  describe,
  skipRestore,
}: UseDraftOptions<T>): DraftHandle {
  const { t } = useTranslation();
  const dialog = useDialog();

  const [restoring, setRestoring] = useState(true);
  const armed = useRef(false);
  const askedFor = useRef<string | null>(null);

  // Latest values without re-running the restore effect when they change.
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const hasContentRef = useRef(hasContent);
  hasContentRef.current = hasContent;
  const describeRef = useRef(describe);
  describeRef.current = describe;

  useEffect(() => {
    requestDurableStorage();
  }, []);

  // ---- 1. offer whatever was left behind ---------------------------------
  useEffect(() => {
    if (!key || askedFor.current === key) return;
    askedFor.current = key;
    armed.current = false;
    setRestoring(true);

    let cancelled = false;

    void (async () => {
      const saved = skipRestore ? null : await loadDraft<T>(key);
      if (cancelled) return;

      if (saved && hasContentRef.current(saved.data)) {
        const what = describeRef.current?.(saved.data) ?? null;
        const keep = await dialog.confirm({
          title: t('drafts.resumeTitle'),
          message: what
            ? t('drafts.resumeBodyNamed', { what, ago: agoLabel(saved.savedAt, t) })
            : t('drafts.resumeBody', { ago: agoLabel(saved.savedAt, t) }),
          confirmLabel: t('drafts.resumeConfirm'),
          cancelLabel: t('drafts.resumeDiscard'),
        });
        if (cancelled) return;
        if (keep) onRestoreRef.current(saved.data);
        else await clearDraft(key);
      }

      if (cancelled) return;
      armed.current = true;
      setRestoring(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skipRestore]);

  // ---- 2. write, every single change --------------------------------------
  //
  // Keyed on the serialized value rather than the object identity: these forms
  // rebuild their state objects on every render, and identity would write on
  // every render including the ones that changed nothing.
  const serialized = JSON.stringify(value);

  useEffect(() => {
    if (!key || !armed.current) return;
    if (hasContentRef.current(value)) saveDraft(key, value);
    else void clearDraft(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, serialized]);

  // ---- 3. one last write on the way out ----------------------------------
  //
  // Belt and braces. Per-keystroke saving already covers this; the listener
  // costs nothing and catches the case where a write was still in the native
  // module's queue when the app went to the background.
  useEffect(() => {
    if (!key) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && armed.current && hasContentRef.current(value)) {
        saveDraft(key, value);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, serialized]);

  const clear = useCallback(() => {
    armed.current = false;
    if (key) void clearDraft(key);
  }, [key]);

  return { restoring, clear };
}

/**
 * Desktop-browser "you have unsaved changes" prompt.
 *
 * Deliberately a small, separate thing, because it only helps in one place: a
 * laptop, closing a tab or hitting back, where the browser will actually stop
 * and ask. On a phone it does nothing at all — Android can kill a backgrounded
 * tab without firing this, and no mobile browser will interrupt a swipe-away
 * to show a dialog.
 *
 * So this is a courtesy on top of the real protection, never a substitute for
 * it. If autosave were not already covering the phone case, this would be
 * security theatre. The browser ignores any custom message and shows its own
 * wording, which is why none is passed.
 */
export function useUnsavedWarning(active: boolean): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const win = globalThis as unknown as {
      addEventListener?: (t: string, f: (e: Event) => void) => void;
      removeEventListener?: (t: string, f: (e: Event) => void) => void;
    };
    if (!win.addEventListener) return;

    const onBeforeUnload = (e: Event) => {
      e.preventDefault();
      // Legacy requirement: some browsers only honour the prompt when
      // returnValue is set to something truthy.
      (e as BeforeUnloadEvent).returnValue = true as unknown as string;
    };
    win.addEventListener('beforeunload', onBeforeUnload);
    return () => win.removeEventListener?.('beforeunload', onBeforeUnload);
  }, [active]);
}
