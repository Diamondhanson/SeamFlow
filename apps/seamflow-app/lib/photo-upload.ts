import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { onlineManager } from '@tanstack/react-query';
import { PermissionDeniedError, PhotoOfflineError } from './permissions';
import { UploadError } from './errors';
import { supabase } from './supabase';
import { api } from './api';
import type {
  Design,
  Work,
  WorkCreateInput,
  WorkImageCreateInput,
  MessageAttachment,
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
    // Technical detail for logs only; users see the friendly `errors.uploadFailed`.
    throw new UploadError(
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
/** Private. Holds the tailor's own finished work before it's published. */
const WORKS_BUCKET = 'works';
/** Private. Chat attachments, readable only by the two participants. */
const CHAT_BUCKET = 'chat-media';

// A profile photo needs just one modest square-ish variant.
const AVATAR_MAX_DIM = 512;
const AVATAR_QUALITY = 0.82;

const FULL_MAX_DIM = 2048;
const FULL_QUALITY = 0.82;

const THUMB_MAX_DIM = 400;
const THUMB_QUALITY = 0.65;

/** Attributes optionally set at upload time; the rest can be filled in later. */
export type WorkCreateMeta = Pick<
  WorkCreateInput,
  | 'title'
  | 'description'
  | 'garmentType'
  | 'audience'
  | 'fabric'
  | 'occasion'
  | 'tags'
  | 'orderId'
  | 'startingPrice'
  | 'currency'
>;

export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
}

interface CompressedOutput {
  uri: string;
  base64: string;
  contentType: 'image/webp' | 'image/jpeg' | 'image/png';
  ext: 'webp' | 'jpg' | 'png';
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
 * Can this platform actually ENCODE WebP?
 *
 * Asking matters because failure here is silent. On web the manipulator ends up
 * at `canvas.toBlob(cb, 'image/webp')`, and the HTML spec requires a browser
 * that doesn't support the requested type to substitute `image/png` instead of
 * failing. iOS Safari has no WebP encoder (it decodes fine), so it returned PNG
 * bytes, nothing threw, and we labelled them `image/webp` — which later made
 * Claude reject the measurement scan with a media-type mismatch.
 *
 * Probing once up front means iOS gets a real JPEG rather than a PNG, which
 * also matters for size: a PNG of a photograph is roughly 3x the JPEG.
 *
 * Native platforms have real encoders; only web needs the probe.
 */
let webpEncodable: boolean | null = null;
function canEncodeWebp(): boolean {
  if (Platform.OS !== 'web') return true;
  if (webpEncodable !== null) return webpEncodable;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    webpEncodable = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpEncodable = false;
  }
  return webpEncodable;
}

/**
 * Label an encoded buffer from its ACTUAL bytes, not from what we asked for.
 *
 * Belt and braces behind the probe: whatever the encoder decided to hand back,
 * the stored contentType and extension describe it truthfully. Mislabelled
 * objects are invisible in the UI (browsers sniff images and ignore the
 * declared type) and only blow up much later, when something forwards the
 * declared type to a service that validates it.
 *
 * These are the base64 renderings of each format's magic bytes.
 */
function labelFromBytes(
  base64: string,
): { contentType: CompressedOutput['contentType']; ext: CompressedOutput['ext'] } | null {
  if (base64.startsWith('iVBORw0KGgo')) return { contentType: 'image/png', ext: 'png' };
  if (base64.startsWith('/9j/')) return { contentType: 'image/jpeg', ext: 'jpg' };
  if (base64.startsWith('UklGR')) return { contentType: 'image/webp', ext: 'webp' };
  return null; // unrecognised — keep whatever the caller intended
}

/**
 * Encode one variant. Prefers WebP where the platform can genuinely produce it,
 * JPEG otherwise, and labels the result from the bytes that come back.
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

  const encode = async (
    format: ExpoImageManipulator.SaveFormat,
    intended: CompressedOutput,
  ): Promise<CompressedOutput> => {
    const out = await IM.manipulateAsync(asset.uri, actions, {
      compress: quality,
      format,
      base64: true,
    });
    const base64 = out.base64 ?? '';
    return { ...intended, uri: out.uri, base64, ...(labelFromBytes(base64) ?? {}) };
  };

  const asJpeg = () =>
    encode(IM.SaveFormat.JPEG, {
      uri: '',
      base64: '',
      contentType: 'image/jpeg',
      ext: 'jpg',
    });

  if (!canEncodeWebp()) return asJpeg();

  try {
    return await encode(IM.SaveFormat.WEBP, {
      uri: '',
      base64: '',
      contentType: 'image/webp',
      ext: 'webp',
    });
  } catch {
    // Encoder rejected this particular source even though it advertises WebP.
    return asJpeg();
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
    throw new UploadError(`Upload failed (${storagePath}): image encoding produced no data`);
  }
  const bytes = base64ToBytes(variant.base64);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: variant.contentType, upsert: false });
  if (error) throw new UploadError(`Upload failed (${storagePath}): ${error.message}`);
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

/**
 * Upload a piece of the tailor's own finished work into the PRIVATE `works`
 * bucket, then register it in the portfolio ("My Designs").
 *
 * Private on purpose: a piece is not public until the tailor explicitly
 * publishes it, at which point the server copies a derivative into the public
 * `feed` bucket. Uploading straight to the public bucket would make every
 * unpublished piece fetchable by anyone who guessed the URL.
 */
export async function uploadWork(args: {
  tailorId: string;
  /** One asset, or several angles of the SAME garment — front, back, side. */
  assets: PickedAsset[];
  meta?: WorkCreateMeta;
  /** Called after each image lands, so a multi-photo design can show progress. */
  onProgress?: (done: number, total: number) => void;
}): Promise<Work> {
  const { tailorId, assets, meta, onProgress } = args;
  if (assets.length === 0) throw new UploadError('No photos to upload');

  const folder = `${tailorId}/works`;
  const uploaded: WorkImageCreateInput[] = [];

  // Sequential, not Promise.all. Encoding several images at once spikes memory
  // enough to stall a mid-range Android phone — the same reason the Design
  // Studio uploads one at a time.
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const { full, thumb } = await compressBoth(asset);

    const id = cryptoRandom();
    const storagePath = `${folder}/${id}.${full.ext}`;
    const thumbnailPath = `${folder}/${id}_thumb.${thumb.ext}`;

    await Promise.all([
      uploadOne(WORKS_BUCKET, storagePath, full),
      uploadOne(WORKS_BUCKET, thumbnailPath, thumb),
    ]);

    uploaded.push({
      storagePath,
      thumbnailPath,
      // Stored so a grid can reserve space before the image loads.
      width: asset.width,
      height: asset.height,
    });
    onProgress?.(i + 1, assets.length);
  }

  return api.works.create({ images: uploaded, ...(meta ?? {}) });
}

/**
 * Upload more angles onto a design that already exists.
 *
 * Separate from `uploadWork` because the design is already registered: these
 * images are appended to it rather than creating a second entry, which is the
 * difference between "another photo of this dress" and "another dress".
 */
export async function uploadWorkImages(args: {
  tailorId: string;
  workId: string;
  assets: PickedAsset[];
  onProgress?: (done: number, total: number) => void;
}): Promise<Work> {
  const { tailorId, workId, assets, onProgress } = args;
  if (assets.length === 0) throw new UploadError('No photos to upload');

  const folder = `${tailorId}/works`;
  const uploaded: WorkImageCreateInput[] = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    const { full, thumb } = await compressBoth(asset);

    const id = cryptoRandom();
    const storagePath = `${folder}/${id}.${full.ext}`;
    const thumbnailPath = `${folder}/${id}_thumb.${thumb.ext}`;

    await Promise.all([
      uploadOne(WORKS_BUCKET, storagePath, full),
      uploadOne(WORKS_BUCKET, thumbnailPath, thumb),
    ]);

    uploaded.push({ storagePath, thumbnailPath, width: asset.width, height: asset.height });
    onProgress?.(i + 1, assets.length);
  }

  return api.works.addImages(workId, { images: uploaded });
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
