-- ============================================================================
-- A shareable catalogue link per tailor.
--
-- Two columns, and the reasoning behind each is worth keeping.
--
-- `slug` — the tailor's public address. This link is a marketing asset: it
-- goes in an Instagram bio, on a WhatsApp status, on a printed shop sign. A
-- raw UUID in that position looks machine-generated and gets less trust, so
-- the public URL is /t/<slug> and never /t/<uuid>.
--
-- Nullable on purpose. Backfilling every existing tailor would mint addresses
-- for shops that have never asked to be findable, and a slug derived from a
-- business name is a small disclosure in itself. It is created on first share
-- instead — an explicit act — see FeedService.ensureSlug.
--
-- Uniqueness is enforced on lower(slug) rather than slug, because two links
-- differing only in case must not resolve to two different shops. The service
-- lowercases before writing; the index is what makes that a guarantee rather
-- than a convention.
--
-- `public_whatsapp` — DELIBERATELY NOT users.phone.
--
-- users.phone is a login credential, and public.tailors' public projection has
-- carried an explicit "no phone, no email" rule since the discovery feed
-- shipped. Reusing it here would silently turn every tailor's sign-in number
-- into a world-readable one the moment they shared a link — a privacy change
-- nobody consented to, applied retroactively.
--
-- So this is a separate, opt-in field. Null by default, filled in only by a
-- tailor who typed a number into the storefront screen knowing it goes on a
-- public page. When it is null the catalogue page simply omits the contact
-- button. Nothing anywhere copies users.phone into it.
-- ============================================================================

alter table public.tailors
  add column if not exists slug            text,
  add column if not exists public_whatsapp text;

comment on column public.tailors.slug is
  'Public catalogue address: www.seamflowtech.com/t/<slug>. Null until the tailor first shares. Lowercase; uniqueness enforced case-insensitively.';

comment on column public.tailors.public_whatsapp is
  'Opt-in, world-readable WhatsApp number in E.164. NOT users.phone — that is a login credential and must never be published. Null means the catalogue page shows no contact button.';

-- Case-insensitive uniqueness. Partial, so the many tailors with no slug yet
-- do not all collide on null.
create unique index if not exists tailors_slug_lower_key
  on public.tailors (lower(slug))
  where slug is not null;

-- ---------------------------------------------------------------------------
-- Shape guard.
--
-- The regex is the same one the API validates against (TailorSlugSchema). It
-- is repeated here rather than trusted to the application layer because this
-- column ends up in a URL: anything that slips through would produce a link
-- that either 404s or, worse, escapes its path segment. Belt and braces on a
-- value that leaves our system.
--
--   3-40 chars, lowercase alphanumeric, single hyphens between segments,
--   no leading/trailing hyphen.
-- ---------------------------------------------------------------------------
alter table public.tailors
  drop constraint if exists tailors_slug_format;

alter table public.tailors
  add constraint tailors_slug_format
  check (
    slug is null
    or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40)
  );
