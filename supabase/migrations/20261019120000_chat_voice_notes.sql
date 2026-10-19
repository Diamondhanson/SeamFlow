-- ============================================================================
-- Voice notes in chat.
--
-- Nothing changes about WHO may read or write `chat-media`: a voice note is
-- stored at `<conversationId>/<uuid>.m4a`, exactly the shape the existing
-- `chat_media_participants` policy already keys on, so the two participants —
-- and only they — can reach it. The policy is deliberately untouched.
--
-- What does change is the MIME allowlist. The 2026-10-17 lockdown narrowed
-- this bucket to images, which was right at the time and would now reject
-- every recording with a storage error the app cannot explain to anyone.
--
-- WHY THESE FOUR TYPES
--
--   audio/mp4, audio/aac   — what an iPhone and an Android phone produce when
--                            recording AAC into an .m4a container. The pair is
--                            listed because the two platforms label the same
--                            file differently.
--   audio/mpeg             — only ever arrives from a browser that cannot do
--                            the above; kept so the web app is not a dead end.
--   audio/webm             — what Chrome's MediaRecorder produces. Allowed for
--                            the same reason, and the reason the player reads
--                            `contentType` from the row instead of assuming.
--
-- The 10 MB ceiling is left exactly where it is. A two-minute note at the
-- bitrate we record is under half a megabyte, so the limit is already two
-- orders of magnitude of headroom — raising it would only widen what an
-- abusive client could push into a private bucket.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm'
]
where id = 'chat-media';
