import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { api } from './api';
import type { OrderPhoto, OrderPhotoRole } from '@seamflow/schemas';

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

const BUCKET = 'order-photos';

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
  contentType: 'image/webp' | 'image/jpeg';
  ext: 'webp' | 'jpg';
}

async function ensurePermission(source: 'camera' | 'library'): Promise<boolean> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/** Open the camera or photo library and return the picked asset (or null if cancelled). */
export async function pickPhoto(
  source: 'camera' | 'library',
): Promise<PickedAsset | null> {
  const ok = await ensurePermission(source);
  if (!ok) throw new Error(`Permission denied for ${source}`);

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
    });
    return { uri: out.uri, contentType: 'image/webp', ext: 'webp' };
  } catch {
    // WebP unsupported on this device for this source — fall back to JPEG.
    const out = await IM.manipulateAsync(asset.uri, actions, {
      compress: quality,
      format: IM.SaveFormat.JPEG,
    });
    return { uri: out.uri, contentType: 'image/jpeg', ext: 'jpg' };
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

async function uploadOne(
  storagePath: string,
  variant: CompressedOutput,
): Promise<void> {
  const res = await fetch(variant.uri);
  const blob = await res.blob();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: variant.contentType, upsert: false });
  if (error) throw new Error(`Upload failed (${storagePath}): ${error.message}`);
}

/**
 * Pick → compress (full + thumb) → upload both → register one DB row.
 * Returns the registered OrderPhoto (with both signed URLs).
 */
export async function uploadAndRegister(args: {
  tailorId: string;
  orderId: string;
  asset: PickedAsset;
  role?: OrderPhotoRole;
  caption?: string;
}): Promise<OrderPhoto> {
  const { tailorId, orderId, asset, role, caption } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const folder = `${tailorId}/${orderId}`;
  const fullPath = `${folder}/${id}.${full.ext}`;
  const thumbPath = `${folder}/${id}_thumb.${thumb.ext}`;

  await Promise.all([uploadOne(fullPath, full), uploadOne(thumbPath, thumb)]);

  return api.orderPhotos.createForOrder(orderId, {
    storagePath: fullPath,
    thumbnailPath: thumbPath,
    contentType: full.contentType,
    role,
    caption: caption ?? null,
  });
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
