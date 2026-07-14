import * as ImagePicker from 'expo-image-picker';
import { onlineManager } from '@tanstack/react-query';
import { PermissionDeniedError, PhotoOfflineError } from './permissions';
import { supabase } from './supabase';
import { api } from './api';
import type {
  Design,
  GroupOrderPhoto,
  OrderPhoto,
  OrderPhotoRole,
} from '@seamflow/schemas';

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
const DESIGNS_BUCKET = 'designs';
const AVATARS_BUCKET = 'avatars';

// A profile photo needs just one modest square-ish variant.
const AVATAR_MAX_DIM = 512;
const AVATAR_QUALITY = 0.82;

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

  await Promise.all([
    uploadOne(BUCKET, fullPath, full),
    uploadOne(BUCKET, thumbPath, thumb),
  ]);

  return api.orderPhotos.createForOrder(orderId, {
    storagePath: fullPath,
    thumbnailPath: thumbPath,
    contentType: full.contentType,
    role,
    caption: caption ?? null,
  });
}

/**
 * Group-order variant of `uploadAndRegister`: one shared reference/inspiration
 * image for a whole group order. Reuses the `order-photos` bucket under
 * `<tailorId>/groups/<groupOrderId>/<uuid>` so the server's tailor-id path
 * check still holds. Returns the registered GroupOrderPhoto (with signed URLs).
 */
export async function uploadAndRegisterGroupPhoto(args: {
  tailorId: string;
  groupOrderId: string;
  asset: PickedAsset;
  role?: OrderPhotoRole;
  caption?: string;
}): Promise<GroupOrderPhoto> {
  const { tailorId, groupOrderId, asset, role, caption } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const folder = `${tailorId}/groups/${groupOrderId}`;
  const fullPath = `${folder}/${id}.${full.ext}`;
  const thumbPath = `${folder}/${id}_thumb.${thumb.ext}`;

  await Promise.all([
    uploadOne(BUCKET, fullPath, full),
    uploadOne(BUCKET, thumbPath, thumb),
  ]);

  return api.groupOrderPhotos.createForGroup(groupOrderId, {
    storagePath: fullPath,
    thumbnailPath: thumbPath,
    contentType: full.contentType,
    role,
    caption: caption ?? null,
  });
}

/**
 * Same pick → compress → upload flow, but into the tailor-scoped `designs`
 * bucket for the inspiration library. Path: `<tailorId>/designs/<uuid>.<ext>`.
 */
export async function uploadDesign(args: {
  tailorId: string;
  asset: PickedAsset;
  caption?: string | null;
  tags?: string[];
}): Promise<Design> {
  const { tailorId, asset, caption, tags } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const folder = `${tailorId}/designs`;
  const fullPath = `${folder}/${id}.${full.ext}`;
  const thumbPath = `${folder}/${id}_thumb.${thumb.ext}`;

  await Promise.all([
    uploadOne(DESIGNS_BUCKET, fullPath, full),
    uploadOne(DESIGNS_BUCKET, thumbPath, thumb),
  ]);

  return api.designs.create({
    storagePath: fullPath,
    thumbnailPath: thumbPath,
    contentType: full.contentType,
    caption: caption ?? null,
    tags: tags ?? [],
  });
}

/**
 * Pick → compress → upload a template reference image / stencil into the
 * `designs` bucket under `<tailorId>/templates/<uuid>`. Unlike designs there's
 * no DB row of its own — the returned metadata is stored inline on the
 * template's `images[]` array (via create/update). `id` doubles as the storage
 * filename and the stable entry key.
 */
export async function uploadTemplateImage(args: {
  tailorId: string;
  asset: PickedAsset;
}): Promise<{
  id: string;
  storagePath: string;
  thumbnailPath: string;
  contentType: string;
}> {
  const { tailorId, asset } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const folder = `${tailorId}/templates`;
  const storagePath = `${folder}/${id}.${full.ext}`;
  const thumbnailPath = `${folder}/${id}_thumb.${thumb.ext}`;

  await Promise.all([
    uploadOne(DESIGNS_BUCKET, storagePath, full),
    uploadOne(DESIGNS_BUCKET, thumbnailPath, thumb),
  ]);

  return { id, storagePath, thumbnailPath, contentType: full.contentType };
}

/**
 * Pick → compress → upload a fabric swatch photo into the `designs` bucket
 * under `<tailorId>/fabrics/<uuid>`. Like template images there's no DB row of
 * its own — the returned keys are stored inline on the fabric's
 * `photoKey` / `photoThumbKey` columns.
 */
export async function uploadFabricImage(args: {
  tailorId: string;
  asset: PickedAsset;
}): Promise<{ photoKey: string; photoThumbKey: string; contentType: string }> {
  const { tailorId, asset } = args;
  const { full, thumb } = await compressBoth(asset);

  const id = cryptoRandom();
  const folder = `${tailorId}/fabrics`;
  const photoKey = `${folder}/${id}.${full.ext}`;
  const photoThumbKey = `${folder}/${id}_thumb.${thumb.ext}`;

  await Promise.all([
    uploadOne(DESIGNS_BUCKET, photoKey, full),
    uploadOne(DESIGNS_BUCKET, photoThumbKey, thumb),
  ]);

  return { photoKey, photoThumbKey, contentType: full.contentType };
}

/**
 * Pick → compress → upload a tailor profile photo into the PUBLIC `avatars`
 * bucket, and return its stable public URL (to store on tailor.photoUrl).
 * Path: `<tailorId>/<uuid>.<ext>`.
 */
export async function uploadTailorLogo(args: {
  tailorId: string;
  asset: PickedAsset;
}): Promise<string> {
  const { tailorId, asset } = args;
  const image = await encodeVariant(asset, AVATAR_MAX_DIM, AVATAR_QUALITY);

  const path = `${tailorId}/${cryptoRandom()}.${image.ext}`;
  await uploadOne(AVATARS_BUCKET, path, image);

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
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
