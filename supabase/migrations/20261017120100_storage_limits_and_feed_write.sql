-- ============================================================================
-- Two storage holes.
--
-- 1. THE PUBLIC BUCKET HAD A WRITE POLICY NOTHING USED.
--
--    `feed` is public: anything in it is served from the CDN to anyone, with
--    no signature and no expiry. `feed_tailor_write` let any signed-in tailor
--    PUT straight into their own folder there — and the bucket has no size
--    limit and no mime allowlist, so that meant an arbitrary file of arbitrary
--    size hosted on a supabase.co URL.
--
--    Nothing legitimate used it. Feed images are written server-side: works
--    are copied out of the private `order-photos` bucket into `feed` by the
--    API with the service role (works.service.ts). No app writes to `feed` —
--    the apps only ever read its public URLs.
--
--    So the policy is removed rather than narrowed. Reads stay public, which
--    is the whole point of the bucket.
--
-- 2. FOUR BUCKETS HAD NO SIZE LIMIT AND NO MIME ALLOWLIST.
--
--    `designs`, `order-photos` and `requests` have carried 10 MB plus an image
--    allowlist since they were created. `works`, `chat-media`, `support-media`
--    and `verification-evidence` never got one, and the apps upload to all of
--    them DIRECTLY — the bytes never pass through seamflow-api, so the API's
--    rate limiter, its validation and the subscription caps do not apply. The
--    bucket is the only place a limit can live.
--
--    The allowlist is copied from `designs` rather than invented: every upload
--    path re-encodes to jpeg/png/webp before uploading (photo-upload.ts), and
--    heic/heif are kept for the same reason the sibling buckets keep them — an
--    iOS original that reaches the bucket unconverted must not fail silently.
-- ============================================================================

drop policy if exists feed_tailor_write on storage.objects;

update storage.buckets
set
  file_size_limit = 10485760,  -- 10 MB, as on designs / order-photos / requests
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
  ]
where id in ('works', 'chat-media', 'support-media', 'verification-evidence');
