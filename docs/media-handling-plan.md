# SeamFlow media handling plan — images & short video (plain-English)

Status: reference · Last updated: 2026-07-05

How we keep photos and short videos **fast to upload, fast to view, small in
storage, and tiny in the database** — especially once the social feed lands and
both apps (tailor + client) browse lots of media. Written to be understood by
anyone.

## The one rule that answers "will it fill up our database?"

**Media never lives in the database.** The database only stores a small text
**pointer** (the file's path + metadata like size, width/height, duration). The
actual bytes live in **object storage** (Supabase Storage today), with a **CDN**
in front. So no matter how many photos/videos pile up, the database stays small
and fast; storage grows separately and is cheap.

> Already true today: images are compressed on the phone, uploaded straight to
> Supabase Storage, and served via short-lived signed URLs — the DB row only
> holds the path + a thumbnail path. The social/video layer just extends this.

## The pipeline in one line

**Phone compresses → uploads straight to storage → storage + CDN serve it back →
DB holds only the pointer.** The API is never in the middle of the bytes.

---

## 1. Fast uploads, always

- [ ] **Upload direct-to-storage, not through the API.** (Already done.) The
  server never becomes the bottleneck.
- [ ] **Compress on the device before upload.** (Images: already done — WebP,
  two sizes.) A 300 KB file beats a 5 MB one — critical on slow mobile networks.
- [ ] **For video: shrink on-device first** — cap resolution (720p is plenty for
  a feed), cap length (short clips, ~15–60s), generate a poster thumbnail.
- [ ] **Resumable/chunked uploads for video** (Supabase Storage supports TUS) so a
  dropped connection resumes instead of restarting.
- [ ] **Optimistic posting** — show the post immediately using the local file
  while it finishes uploading in the background.
- [ ] **Retry + offline queue** — if upload fails, retry with backoff; queue it if
  offline and send when back online.

## 2. Fast downloads (both apps browsing each other)

- [ ] **Put a CDN in front of storage.** *The single biggest win.* Keeps copies of
  media on servers near the viewer, so the feed loads fast everywhere.
- [ ] **Serve the right size for the moment** — tiny thumbnail in feeds/grids, a
  medium size for cards, full-res only on tap. (We already do thumb + full;
  add a medium for feeds.)
- [ ] **Video streams, doesn't download.** Use adaptive streaming (HLS): the
  player fetches only what it needs and adjusts quality to the network. Show the
  poster thumbnail instantly; play on tap / when it scrolls into view.
- [ ] **Lazy-load + prefetch + on-device cache.** Load images as they scroll in,
  prefetch the next few, cache with a component like `expo-image`.
- [ ] **Blur-up placeholders** — a tiny blurred preview that sharpens, so nothing
  "pops" in and the feed feels instant.

## 3. Compression / optimization (small storage, kept quality)

- [ ] **Images:** on-device resize + modern format (WebP now, AVIF later) at good
  quality, in a few sizes (thumb / medium / full). Strip EXIF (already done).
  ~70–80% smaller with no visible loss.
- [ ] **Video:** transcode to a modern codec (H.264 for compatibility;
  HEVC/AV1 for smaller), cap resolution + length, auto-generate a poster image.
- [ ] **Housekeeping:** delete orphaned files; later move rarely-viewed old media
  to cheaper "cold" storage. Keeps the bill flat.
- [ ] **Store dimensions/duration in the DB row** so the app can lay out the feed
  (correct aspect ratio) *before* the media loads — no layout jumps.

## 4. Do both apps share one database + storage?

**Yes.** The tailor app and the client app talk to the **same backend, same
database, and same storage buckets** — they're two views of one shared record.
**Permissions (RLS) decide who sees what:** private order photos stay private;
public feed posts are visible to everyone; a signed URL or public-CDN path is
issued per the rules. Different apps, different screens, one source of truth,
nothing duplicated.

---

## Which provider, and when

- **Now (images only):** keep **Supabase Storage**. Add a **CDN** in front when
  the feed launches (Supabase has CDN options; Cloudflare in front also works).
- **When short video becomes core:** use a **dedicated video service —
  [Mux](https://www.mux.com) or [Cloudflare Stream](https://www.cloudflare.com/products/cloudflare-stream/).**
  You upload the raw clip; they auto-compress it, produce the adaptive-streaming
  (HLS) versions + thumbnail, and serve via their global CDN. You just store the
  pointer + a poster URL. Video transcoding + streaming is genuinely hard to do
  well yourself — this is the one place worth paying a specialist. (Roadmap 4.2
  already names Mux/Cloudflare Stream.)
- **Later / heavy scale:** consider moving image storage behind a CDN like
  Cloudflare or a bucket + CloudFront-style CDN; add lifecycle rules for cold
  storage. Only when volume/cost justifies it.

## If you only remember three things

1. **Never put bytes in the database** — pointer + metadata only. Storage + CDN
   hold the media.
2. **Compress on the phone, upload direct-to-storage, serve through a CDN** with
   right-sized thumbnails.
3. **Use Mux / Cloudflare Stream for video** when it becomes central — don't build
   your own transcoding/streaming.
