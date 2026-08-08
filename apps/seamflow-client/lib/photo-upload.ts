import * as ImagePicker from 'expo-image-picker';
import { onlineManager } from '@tanstack/react-query';
import { PermissionDeniedError, PhotoOfflineError } from './permissions';
import { supabase } from './supabase';
import type { MessageAttachment } from '@seamflow/schemas';

// Lazy-load image-manipulator so the auth/onboarding screens still load on
// dev APKs that pre-date the photos feature. If the native module is
// missing we throw a clear error only when a user actually picks a photo.
import type * as ExpoImageManipulator from 'expo-image-manipulator';
type IMModule = typeof ExpoImageManipulator;
let ImageManipulatorMod: IMModule | null = null;
function getIM(): IMModule {
  if (ImageManipulatorMod) return ImageManipulatorMod;
  try {
    ImageManipulatorMod = require('expo-image-manipulator') as IMModule;
    return ImageManipulatorMod;
  } catch {
    throw new Error(
      'Photo features need an APK rebuilt with expo-image-manipulator. Run `pnpm expo run:android` to refresh.',
    );
  }
}

// Client app: only chat attachments are uploaded from here.
// ============================================================================
// Compression strategy
//
// Two variants are encoded client-side from a single picker action:
//   - FULL:  longest side ≤ 2048 px, WebP @ q=82  → ~150–300 KB
//   - THUMB: longest side ≤ 400 px,  WebP @ q=65  → ~20–40 KB
//
// WebP is ~25–30 % smaller than JPEG at the same perceptual quality and is
// universally supported in 2026. If WebP encoding errors on a device we
// transparently fall back to JPEG.
//
// EXIF metadata is stripped as a side-effect of `manipulateAsync`. This is a
// small win on storage and a meaningful one on privacy (no embedded GPS).
//
// "Don't upscale": if the source is already smaller than the variant cap, the
// resize op is skipped so we don't blur small images.
// ============================================================================

/** Private. Holds the tailor's own finished work before it's published. */
/** Private. Chat attachments, readable only by the two participants. */
const CHAT_BUCKET = 'chat-media';


const FULL_MAX_DIM = 2048;
const FULL_QUALITY = 0.82;

const THUMB_MAX_DIM = 400;
const THUMB_QUALITY = 0.65;

interface PickedAsset {
  uri: string;
  width: number;
  height: number;
}

interface CompressedOutput {
  uri: string;
  base64: string;
  contentType: 'image/webp' | 'image/jpeg';
  ext: 'webp' | 'jpg';
}

/**
 * Ensure camera / photo-library access. Throws `PermissionDeniedError`
 * (carrying `canAskAgain`) when the OS denies, so the UI can offer an
 * "Open Settings" path — critical on iOS, which never re-prompts after the
 * first denial.
 */
async function ensurePermission(source: 'camera' | 'library'): Promise<void> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      throw new PermissionDeniedError('camera', perm.canAskAgain);
    }
    return;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new PermissionDeniedError('photos', perm.canAskAgain);
  }
}

/**
 * Ceiling on a single multi-select. Ten is a deliberate limit, not a technical
 * one: each image is compressed into two variants and uploaded, so a bigger
 * batch means a long wait with the picker closed and nothing to look at.
 */
export const MAX_MULTI_SELECT = 10;

/**
 * Multi-select sibling of `pickPhoto`. Returns every asset the user chose, in
 * pick order, or an empty array if they cancelled.
 *
 * The camera is inherently one-shot — `launchCameraAsync` captures a single
 * frame — so that source still yields at most one asset. Multi-select is a
 * library idiom only.
 */
export async function pickPhotos(
  source: 'camera' | 'library',
  limit: number = MAX_MULTI_SELECT,
): Promise<PickedAsset[]> {
  if (!onlineManager.isOnline()) {
    throw new PhotoOfflineError();
  }
  await ensurePermission(source);

  const toAsset = (a: ImagePicker.ImagePickerAsset): PickedAsset => ({
    uri: a.uri,
    width: a.width,
    height: a.height,
  });

  if (source === 'camera') {
    const shot = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (shot.canceled) return [];
    return shot.assets[0] ? [toAsset(shot.assets[0])] : [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    // `allowsEditing` is single-asset only — turning it on silently disables
    // multi-select on both platforms.
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  if (result.canceled) return [];
  // `selectionLimit` isn't honoured by every Android picker implementation,
  // so clamp here too rather than trusting the OS to have enforced it.
  return result.assets.slice(0, limit).map(toAsset);
}

/** Open the camera or photo library and return the picked asset (or null if cancelled). */
export async function pickPhoto(
  source: 'camera' | 'library',
): Promise<PickedAsset | null> {
  // Photo uploads hit storage directly (not the offline mutation queue), so
  // they can't be deferred. Fail fast with a clear message when offline
  // instead of letting the picker → upload hang on a network error.
  if (!onlineManager.isOnline()) {
    throw new PhotoOfflineError();
  }
  await ensurePermission(source);

  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1, // we recompress below
    allowsEditing: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Encode one variant. Tries WebP first; falls back to JPEG if the platform
 * doesn't accept WebP encoding for this image.
 */
async function encodeVariant(
  asset: PickedAsset,
  maxDim: number,
  quality: number,
): Promise<CompressedOutput> {
  const IM = getIM();
  const longest = Math.max(asset.width, asset.height);
  const actions: ExpoImageManipulator.Action[] = [];
  if (longest > maxDim) {
    const isLandscape = asset.width >= asset.height;
    actions.push({ resize: isLandscape ? { width: maxDim } : { height: maxDim } });
  }

  try {
    const out = await IM.manipulateAsync(asset.uri, actions, {
      compress: quality,
      format: IM.SaveFormat.WEBP,
      base64: true,
    });
    return { uri: out.uri, base64: out.base64 ?? '', contentType: 'image/webp', ext: 'webp' };
  } catch {
    // WebP unsupported on this device for this source — fall back to JPEG.
    const out = await IM.manipulateAsync(asset.uri, actions, {
      compress: quality,
      format: IM.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: out.uri, base64: out.base64 ?? '', contentType: 'image/jpeg', ext: 'jpg' };
  }
}

/** Encode both variants in parallel. */
async function compressBoth(
  asset: PickedAsset,
): Promise<{ full: CompressedOutput; thumb: CompressedOutput }> {
  const [full, thumb] = await Promise.all([
    encodeVariant(asset, FULL_MAX_DIM, FULL_QUALITY),
    encodeVariant(asset, THUMB_MAX_DIM, THUMB_QUALITY),
  ]);
  return { full, thumb };
}

/**
 * Decode a base64 string into raw bytes. React Native's `Blob` (via
 * `fetch(uri).blob()`) is an opaque handle with no readable body, so passing it
 * to `storage.upload()` fails the network request. Uploading a `Uint8Array`
 * built from the image-manipulator's base64 output is the RN-safe path.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadOne(
  bucket: string,
  storagePath: string,
  variant: CompressedOutput,
): Promise<void> {
  if (!variant.base64) {
    throw new Error(`Upload failed (${storagePath}): image encoding produced no data`);
  }
  const bytes = base64ToBytes(variant.base64);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: variant.contentType, upsert: false });
  if (error) throw new Error(`Upload failed (${storagePath}): ${error.message}`);
}






/**
 * Compress and upload a chat attachment into the PRIVATE `chat-media` bucket.
 *
 * Namespaced by conversation id, which is what the storage policy checks: only
 * the two participants of that conversation can read or write under it. The
 * returned descriptor is what goes in the message's `attachments` array — the
 * API swaps the paths for short-lived signed URLs on read.
 */
export async function uploadChatImage(args: {
  conversationId: string;
  asset: PickedAsset;
}): Promise<MessageAttachment> {
  const { conversationId, asset } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const storagePath = `${conversationId}/${id}.${full.ext}`;
  const thumbnailPath = `${conversationId}/${id}_thumb.${thumb.ext}`;

  await Promise.all([
    uploadOne(CHAT_BUCKET, storagePath, full),
    uploadOne(CHAT_BUCKET, thumbnailPath, thumb),
  ]);

  return {
    kind: 'image',
    storagePath,
    thumbnailPath,
    width: asset.width,
    height: asset.height,
  };
}



function cryptoRandom(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}
