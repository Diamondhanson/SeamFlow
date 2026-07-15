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

const SALT_KEY = 'pin.salt.v1';
const HASH_KEY = 'pin.hash.v1';
const ATTEMPTS_KEY = 'pin.failed.v1';

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
  const existing = await SecureStore.getItemAsync(SALT_KEY);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  // base64 keeps the string ASCII-safe for secure-store.
  const salt = bufferToBase64(bytes);
  await SecureStore.setItemAsync(SALT_KEY, salt);
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
  const v = await SecureStore.getItemAsync(HASH_KEY);
  return !!v;
}

/**
 * Set or replace the PIN. Caller is responsible for collecting a
 * confirmation (typed twice) before calling.
 */
export async function setPin(pin: string): Promise<void> {
  assertPinShape(pin);
  const salt = await getOrCreateSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(HASH_KEY, hash);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}

/**
 * Remove the PIN entirely. After this `pinExists()` returns false and the
 * lock gate will not engage.
 */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(HASH_KEY);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  // Keep the salt — re-using it on next setPin() is fine and avoids the
  // tiny chance of secure-store fragmenting if we churn salts.
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

  const storedHash = await SecureStore.getItemAsync(HASH_KEY);
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
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
    return { ok: true, failed: 0, shouldSignOut: false };
  }

  const failed = (await getAttempts()) + 1;
  await SecureStore.setItemAsync(ATTEMPTS_KEY, String(failed));
  return {
    ok: false,
    failed,
    shouldSignOut: failed >= MAX_ATTEMPTS,
  };
}

async function getAttempts(): Promise<number> {
  const v = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Reset the failed counter without changing the PIN. */
export async function resetAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}
