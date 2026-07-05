# Design Studio (Moodboard + AI photo-to-notes) — build plan

Status: proposed · Owner: —  · Last updated: 2026-07-03

## What we're building

A **Design Studio** home tile that gives a tailor one place to collect and describe design ideas:

1. **Inspiration library (moodboard)** — save images (camera or library) as tailor-scoped inspiration, with a caption and tags. Not tied to an order.
2. **Attach inspiration to an order** — push a saved inspiration onto a specific order so it sits alongside the measurements. (Order photos already exist; we bridge the two.)
3. **AI photo-to-notes (image → text)** — an "auto-describe" action, powered by Claude vision, that turns a photo into a written garment spec / fabric description / tags. Shown with an **Accept / Edit / Discard** flow; never auto-saved.

Explicitly **out of scope for this plan**: AI *image generation* (text → new image). That needs a separate external model and is deferred. The tile is structured so a future **"Generate"** tab can slot in without rework.

## Product decisions (settled)

- **One tile, not two.** A single "Design Studio" tile opens a screen with a **"My inspirations"** view. Generated images (future) will save into this same library. Rationale: it's one mental space, and generation results should flow into the library.
- **Moodboard is tailor-scoped**, independent of any order. Attaching to an order is an explicit action.
- **AI output is always a draft.** Show it next to the source image with Accept / Edit / Discard. Wrong guesses (e.g. fabric composition) must be trivially editable.

## Architecture — reuse what exists

The order-photos subsystem already solves image storage end to end; the moodboard mirrors it closely.

| Concern | Existing pattern we copy | New for Design Studio |
| --- | --- | --- |
| Storage bucket + RLS | `order-photos` bucket, path `tailorId/orderId/uuid.webp`, storage RLS via `(storage.foldername(name))[1]` = tailor id | New `designs` bucket, path `tailorId/designs/uuid.webp` |
| Two-variant compression | `lib/photo-upload.ts` (2048px full + 400px thumb, WebP, EXIF stripped) | Reused as-is (generalize path builder) |
| DB table + RLS | `order_photos` table, RLS via parent order's tailor | New `designs` table, RLS directly on `tailor_id` |
| API module | `order-photos` service/controller/DTO, `TailorsService.requireTailorId`, `@CurrentUser()` | New `designs` module; new `ai` module |
| api-client resource | `resources/order-photos.ts` factory | New `resources/designs.ts`, `resources/ai.ts` |
| Schemas | `packages/schemas/src/order-photo.ts` row + create/update DTOs | New `design.ts` |
| Mobile screens | `app/(app)/clients/…` (list + modal create) + `orders/[id].tsx` photo grid | New `app/(app)/designs/…` |
| AI | — (greenfield: no Anthropic SDK anywhere yet) | New `ai` module + `@anthropic-ai/sdk` |

## Data model

New table `designs` (Drizzle `apps/seamflow-api/src/db/schema/designs.ts` + a Supabase migration):

```
designs
  id              uuid pk
  tailor_id       uuid not null → tailors(id) on delete cascade
  source          text not null default 'uploaded'   -- 'uploaded' | 'generated' (future)
  storage_path    text not null
  thumbnail_path  text
  content_type    text
  caption         text
  tags            jsonb not null default '[]'          -- string[]
  ai_notes        text                                 -- last accepted AI description
  prompt          text                                 -- future: generation prompt
  created_at      timestamptz not null default now()
  index on (tailor_id)
```

Storage: new private bucket `designs`, 10 MB limit, same MIME allowlist as `order-photos`, with the four storage RLS policies copied over (insert/select/update/delete gated on first path segment = tailor id). Table RLS: `tailor_id in (select current_tailor_ids())`.

**Attach-to-order bridge (v1, simplest):** attaching a design to an order **copies** the image into that order via the existing `uploadAndRegister` → `order_photos` flow (role `reference`). This keeps the two path conventions clean and avoids cross-referencing storage objects. A later refinement can make it a true link.

## AI: image → text (Claude vision)

Greenfield — there is no AI code today. New `apps/seamflow-api/src/ai/` module:

- Add `@anthropic-ai/sdk` to `apps/seamflow-api`. New env var `ANTHROPIC_API_KEY` (add to `envSchema`, `.env`, `.env.example`).
- `AiService.describeImage({ tailorId, storagePath, mode })` where `mode ∈ { 'spec', 'fabric', 'tags' }`:
  - Generate a short-lived signed URL for the object (or read bytes) and send to Claude with a fixed system prompt per mode.
  - `spec` → a garment description paragraph; `fabric` → color/pattern/likely material/suggested garments; `tags` → a JSON array of short tags (structured output).
  - Model: **Haiku** for tags/speed, **Sonnet** for the richer spec. Runs **inline** (vision is seconds, not minutes — no queue needed, unlike generation).
- Endpoint `POST /ai/describe-image` `{ storagePath, mode }` → `{ text, tags? }`. Auth + `requireTailorId` like every other controller; verify the `storagePath` starts with the caller's tailor id (belt-and-suspenders, same as order-photos).
- **Cost controls:** free tier N calls/month per tailor, cache results by image hash + mode to avoid re-billing (roadmap 2.4 already sets this precedent).

Mobile: an "Auto-describe" button on a design (and on an order photo). Calls the endpoint, shows result in an **Accept / Edit / Discard** sheet. Accept writes into `ai_notes`/`tags` (design) or appends to the order's notes.

## Mobile surface

- New tile in `app/(app)/index.tsx` `tiles[]`: label "Design Studio", icon e.g. `color-palette`, route `/(app)/designs`.
- `app/(app)/designs/index.tsx` — inspiration grid (thumbnails, tags, search), "+ Add" → picker (camera/library) → upload via reused `photo-upload`. Per-item: caption, tags, Auto-describe, Attach to order, Delete (with confirm).
- `app/(app)/designs/new.tsx` (modal) — add/caption a new inspiration (or fold into the grid's add flow).
- Order detail (`orders/[id].tsx`) — add "Attach from inspiration" next to the existing photo controls, and an "Auto-describe → add to notes" action on order photos.
- `lib/queries.ts` — `useDesigns`, `useCreateDesign`, `useUpdateDesign`, `useDeleteDesign`, `useDescribeImage`; query keys in `lib/query-keys.ts`.

## Milestones (suggested sequence)

**M1 — Inspiration library (no AI).** Ships the tile + full value on its own, zero external cost.
- Schema `design.ts` + export; `designs` table migration + bucket + RLS.
- API `designs` module (list/create/update/delete) + register in `app.module.ts`.
- api-client `resources/designs.ts`.
- Mobile: tile, `designs/index.tsx` grid, add/upload (reuse `photo-upload`), caption/tags/delete.
- Generalize `photo-upload` path builder to support `tailorId/designs/uuid`.

**M2 — Attach inspiration to orders.**
- "Attach to order" copies a design into the order's `order_photos`.
- Order screen: "Attach from inspiration" picker.

**M3 — AI photo-to-notes.**
- `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`; new `ai` module + `/ai/describe-image`.
- Quota + result cache.
- Mobile Auto-describe + Accept/Edit/Discard on designs and order photos.

**M4 (future, separate plan) — AI generation ("Generate" tab).** External image model, queue job, per-image billing. Not in this plan.

## New env / ops

- `ANTHROPIC_API_KEY` in `apps/seamflow-api/.env` (+ `.env.example`, `envSchema`) — M3 only.
- New Supabase migration(s): `designs` table + `designs` storage bucket + policies → `supabase db push`.
- No native rebuild needed (reuses existing `expo-image-picker`).

## Open questions before M3

1. **Quota / cost model** for AI describe — free monthly cap, paid tier, or unlimited during beta?
2. **Modes** — start with just `spec` (garment description → order notes), or ship `fabric` + `tags` too?
3. **Attach-to-order** — is copy-into-order (v1) acceptable, or do we want true linking from the start?
