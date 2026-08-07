// ============================================================================
// PIN-lock module.
//
// Stores a 4-digit app-unlock PIN in expo-secure-store. The raw PIN never
// lands in storage — what we keep is:
//   - a per-install random salt (32 bytes, base64)
//   - HMAC-SHA-256(salt + PIN) as the hash
//
// On verify: re-hash the entered PIN with the stored salt and compare.
//
// The salt is per-install (not per-user) — a 4-digit PIN has only 10 000
// combinations so the hash isn't a meaningful brute-force barrier on its
// own; the real defenses are:
//   - OS-level keychain encryption that secure-store sits on top of
//   - rate limiting via the failed-attempt counter
//   - forced sign-out after MAX_ATTEMPTS, which dumps the Supabase session
// We still hash because it's basically free, and it means a single
// snapshot of the keychain doesn't reveal the PIN.
//
// Two pieces of state matter at runtime:
//   - PIN hash + salt (this module owns it)
//   - "currently locked" boolean + last-active timestamp (lock-context owns it)
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { canUsePinLock } from './platform-capabilities';

// ----------------------------------------------------------------------------
// Storage access
//
// expo-secure-store has no web implementation — its web build is literally
// `export default {}`, so `SecureStore.getItemAsync` resolves to
// `undefined(...)` and throws a TypeError in a browser. Every read/write below
// goes through these three helpers, which answer "nothing stored" on web
// instead of throwing.
//
// Native behaviour is deliberately unchanged: errors still propagate there. A
// keychain read that fails on a phone must NOT be silently reported as "no PIN
// configured" — that would turn a transient fault into a silently disabled
// lock. Callers that must not hang handle their own failures (see
// lock-context.tsx, which always sets `ready`).
// ----------------------------------------------------------------------------

async function readItem(key: string): Promise<string | null> {
  if (!canUsePinLock) return null;
  return SecureStore.getItemAsync(key);
}

async function writeItem(key: string, value: string): Promise<void> {
  if (!canUsePinLock) return;
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (!canUsePinLock) return;
  await SecureStore.deleteItemAsync(key);
}

/** Thrown when something tries to set a PIN on a platform that can't hold one. */
export class PinUnavailableError extends Error {
  constructor() {
    super('PIN lock is not available on this platform');
    this.name = 'PinUnavailableError';
  }
}

const SALT_KEY = 'pin.salt.v1';
const HASH_KEY = 'pin.hash.v1';
const ATTEMPTS_KEY = 'pin.failed.v1';
/** Supabase user id of whoever set the PIN. The PIN survives sign-out (so a
 *  transient auth hiccup can't erase it), but a DIFFERENT account signing in
 *  clears it — a shared device must never lock the next user behind the
 *  previous user's PIN. */
const OWNER_KEY = 'pin.owner.v1';

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
/**
 * Background time after which the app re-locks on resume. 5 minutes is
 * the standard for "quick check the time on your phone" tolerance vs the
 * "left the app open at lunch" risk.
 */
export const LOCK_AFTER_BACKGROUND_MS = 5 * 60 * 1000;

function assertPinShape(pin: string): void {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
}

/**
 * Cryptographic salt suitable for hashing the PIN. 32 random bytes base64.
 * Re-used across all PIN-changes on this install so we don't need to
 * regenerate on each set — only when the secure-store is cleared.
 */
async function getOrCreateSalt(): Promise<string> {
  const existing = await readItem(SALT_KEY);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  // base64 keeps the string ASCII-safe for secure-store.
  const salt = bufferToBase64(bytes);
  await writeItem(SALT_KEY, salt);
  return salt;
}

function bufferToBase64(bytes: Uint8Array): string {
  // Use the global btoa if available (RN polyfills it); fall back to a
  // manual conversion if not.
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.btoa === 'function') return g.btoa(bin);
  // Manual base64 — only hit on platforms missing btoa, which isn't RN
  // current. Kept as a defensive fallback.
  return Buffer.from(bin, 'binary').toString('base64');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

/** Whether a PIN is currently configured on this device. */
export async function pinExists(): Promise<boolean> {
  const v = await readItem(HASH_KEY);
  return !!v;
}

/**
 * Set or replace the PIN. Caller is responsible for collecting a
 * confirmation (typed twice) before calling. `ownerUserId` records which
 * account the PIN belongs to (see OWNER_KEY); pass null only when no
 * session is available — the next sign-in adopts it.
 */
export async function setPin(pin: string, ownerUserId: string | null): Promise<void> {
  // Reads degrade quietly to "nothing stored", but a write must not: silently
  // no-op'ing here would show the user a "PIN set" confirmation for a PIN that
  // was never stored and will never be asked for.
  if (!canUsePinLock) throw new PinUnavailableError();
  assertPinShape(pin);
  const salt = await getOrCreateSalt();
  const hash = await hashPin(pin, salt);
  await writeItem(HASH_KEY, hash);
  await removeItem(ATTEMPTS_KEY);
  if (ownerUserId) {
    await writeItem(OWNER_KEY, ownerUserId);
  }
}

/**
 * Remove the PIN entirely. After this `pinExists()` returns false and the
 * lock gate will not engage.
 */
export async function clearPin(): Promise<void> {
  await removeItem(HASH_KEY);
  await removeItem(ATTEMPTS_KEY);
  await removeItem(OWNER_KEY);
  // Keep the salt — re-using it on next setPin() is fine and avoids the
  // tiny chance of secure-store fragmenting if we churn salts.
}

/**
 * Called on every sign-in: keep the PIN when the same account returns (so a
 * transient sign-out never costs the user their PIN), clear it when a
 * different account signs in (shared-device safety), and adopt ownerless
 * legacy PINs for the signing-in account.
 */
export async function reconcilePinOwner(userId: string): Promise<void> {
  if (!(await pinExists())) return;
  const owner = await readItem(OWNER_KEY);
  if (!owner) {
    // Legacy PIN from before ownership existed — whoever signs in first
    // adopts it (in practice the device's single real user).
    await writeItem(OWNER_KEY, userId);
    return;
  }
  if (owner !== userId) {
    await clearPin();
  }
}

export interface VerifyResult {
  ok: boolean;
  /** Number of failed attempts SO FAR (including the current one if ok=false). */
  failed: number;
  /** True if the failed counter just crossed MAX_ATTEMPTS — caller should sign out. */
  shouldSignOut: boolean;
}

/**
 * Compare an entered PIN to the stored hash. Increments the failed counter
 * on miss. Returns `shouldSignOut=true` when the counter reaches
 * `MAX_ATTEMPTS` so callers can force a sign-out (which also clears the
 * Supabase session — the user has to sign in again from scratch).
 */
export async function verifyPin(entered: string): Promise<VerifyResult> {
  assertPinShape(entered);

  const storedHash = await readItem(HASH_KEY);
  if (!storedHash) {
    // No PIN set — caller shouldn't have called us, but be safe and treat
    // as a vacuous pass so we don't lock the user out of an unconfigured
    // device.
    return { ok: true, failed: 0, shouldSignOut: false };
  }

  const salt = await getOrCreateSalt();
  const enteredHash = await hashPin(entered, salt);
  const ok = enteredHash === storedHash;

  if (ok) {
    await removeItem(ATTEMPTS_KEY);
    return { ok: true, failed: 0, shouldSignOut: false };
  }

  const failed = (await getAttempts()) + 1;
  await writeItem(ATTEMPTS_KEY, String(failed));
  return {
    ok: false,
    failed,
    shouldSignOut: failed >= MAX_ATTEMPTS,
  };
}

async function getAttempts(): Promise<number> {
  const v = await readItem(ATTEMPTS_KEY);
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Reset the failed counter without changing the PIN. */
export async function resetAttempts(): Promise<void> {
  await removeItem(ATTEMPTS_KEY);
}
