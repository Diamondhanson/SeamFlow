# SeamFlow — scan-to-measurement plan (photo → template / measurement set)

Status: proposal · Last updated: 2026-07-28

Let tailors build a measurement **template** by snapping a photo of their paper
measurement booklet, and capture a **client's measurements** by snapping a
photo of a sheet the client filled in — instead of typing either by hand. Both
are the same idea underneath: point the camera at a page, let Claude read it,
land on a normal SeamFlow form that's already filled in, review, save.

This doc covers **both** features in full. Read the "One extraction, two uses"
section first — it's the whole design in a paragraph — then the two feature
sections, then the backend and rollout.

---

## Why this fits SeamFlow almost for free

The app is already ~80% wired for this. Nothing here needs new infrastructure —
it reuses parts that already ship:

- **AI vision is already built.** `apps/seamflow-api/src/ai/ai.service.ts` runs
  the Anthropic SDK over a stored image (`describeImage`), with a per-mode
  system prompt, and returns `503` when `ANTHROPIC_API_KEY` is unset. The
  controller (`/ai/describe-image`) already gates on `requireTailorId` and the
  service already checks the image's `storagePath` belongs to the caller
  (`storagePath.split('/')[0] !== tailorId`). We add one more capability next to
  it, following the exact same shape.
- **The template model already holds everything we extract.**
  `MeasurementTemplate` (`packages/schemas/src/template.ts`) has
  `fields: { key, label, required?, unit }[]` and `images[]`. The
  `measurement_templates` table stores `fields` as `jsonb`. No schema/DB change
  to store a scanned template.
- **The measurement-set model already fits a filled sheet.** `MeasurementSet`
  (`packages/schemas/src/measurement.ts`) is `{ clientId, templateId?, label,
  values: Record<string, number>, unitPreference }`. A scanned client sheet maps
  straight onto it.
- **The forms already exist.** `app/(app)/templates/new.tsx` already renders a
  `TemplateFieldsEditor` (add/edit/remove fields) and a `TemplateImagesEditor`
  (upload to the `designs` bucket). We pre-fill those, we don't rebuild them.
- **There's already a localized measurement vocabulary.**
  `lib/measurements.ts` → `MEASUREMENT_GROUPS` lists the common measurements
  (chest, waist, hips, sleeveLength, inseam, agbadaLength, gele, …) as
  `measurements.*` i18n keys, resolved in English **and** French. We reuse it to
  normalize what the photo says (e.g. "Poitrine" → chest) so scanned templates
  stay consistent with hand-built ones.

## One extraction, two uses

A blank template page and a filled-in client sheet are the **same photo read**,
differing only in whether the number cells are empty:

- Blank booklet page → a list of measurement **names** (+ units). → a *template*.
- Filled client sheet → the same names **with numbers**. → a *measurement set*
  for one client (which can then be promoted to a template).

So we build **one** extraction endpoint that returns a list of
`{ label, unit, value }`, where `value` is `null` when the cell is blank. The
caller decides what to keep:

- **Template scan** keeps `label` + `unit`, ignores `value`.
- **Client-sheet scan** keeps `label` + `unit` + `value`, tied to a client.

Because the two entry points already know which case they're in, we pass an
explicit `mode` (`'template' | 'measurements'`) — this mirrors the existing
`AiDescribeMode` enum, lets the prompt be precise, and lets us pick the model
(cheap/fast for printed label lists, stronger for handwritten numbers).

The universal rule for both: **extract → review → save. Never auto-save.**
Vision on a photocopied or handwritten page won't be perfect, so the tailor
always lands on an editable form and confirms before anything is written. That
turns "the AI misread one line" from a bug into a two-second edit.

---

## The new contract

One endpoint, sitting right next to `describe-image` in the same `ai` module.

`POST /ai/extract-measurements`

```jsonc
// request
{
  "storagePath": "<tailorId>/…/scan-<uuid>.webp", // an image the tailor owns
  "mode": "template" | "measurements"
}

// response
{
  "mode": "template" | "measurements",
  "detectedUnit": "cm" | "in" | null,   // page-level unit hint, if the sheet says
  "items": [
    {
      "label": "Poitrine",              // the name exactly as read on the page
      "unit": "cm" | "in" | null,       // per-row unit if visible, else null
      "value": 96 | null,               // null in template mode / blank cells
      "confidence": "high" | "low"      // low ⇒ highlight the row for review
    }
    // …one per measurement line found
  ]
}
```

New Zod schemas go in `packages/schemas/src/ai.ts` next to the existing
`AiDescribeImage*` ones:

```ts
export const AiExtractModeSchema = z.enum(['template', 'measurements']);

export const AiExtractMeasurementsRequestSchema = z.object({
  storagePath: z.string().min(1),
  mode: AiExtractModeSchema,
});

export const ExtractedMeasurementItemSchema = z.object({
  label: z.string().min(1),
  unit: z.enum(['cm', 'in']).nullable(),
  value: z.number().positive().nullable(),
  confidence: z.enum(['high', 'low']).optional(),
});

export const AiExtractMeasurementsResponseSchema = z.object({
  mode: AiExtractModeSchema,
  detectedUnit: z.enum(['cm', 'in']).nullable(),
  items: z.array(ExtractedMeasurementItemSchema),
});
```

And a client method in `packages/api-client/src/resources/ai.ts`:

```ts
extractMeasurements(input: AiExtractMeasurementsRequest)
  : Promise<AiExtractMeasurementsResponse> {
  return http.post('/ai/extract-measurements', input);
}
```

> Per `CLAUDE.md`: after touching `packages/schemas` and
> `packages/api-client`, rebuild both
> (`pnpm --filter @seamflow/schemas build`,
> `pnpm --filter @seamflow/api-client build`) so the API and app see the new
> contract.

---

## Feature A — Scan a blank template

**Goal:** photograph a page from the paper booklet; get a reusable
`MeasurementTemplate` the tailor reviews and saves.

### Entry points

- **New Template screen** (`templates/new.tsx`): a "Scan a template" action at
  the top (camera + photo-library options), above the name field.
- **Templates list** (`templates/index.tsx`): alongside the existing starter
  chips, a "Scan a template" shortcut that opens the same flow.

### Flow

1. Tailor taps **Scan a template** → chooses **Take photo** or **Choose from
   library**. (Snap *or* upload, as requested.)
2. The image is compressed on-device (reuse the existing image pipeline the
   media-handling plan describes — WebP, downscaled) and uploaded to the
   `designs` bucket under a scratch path, e.g.
   `<tailorId>/templates/scan/<uuid>.webp`. Reusing the tailor-scoped path keeps
   the existing ownership check happy.
3. Call `ai.extractMeasurements({ storagePath, mode: 'template' })`.
4. Map `items` → `EditableField[]`: `{ label, unit: unit ?? detectedUnit ?? 'cm' }`,
   dropping any `value`. Run each label through the **label-matching layer**
   (below) so "Poitrine"/"Chest" collapse onto the canonical localized name.
5. Drop the fields into the normal New Template form's `TemplateFieldsEditor`,
   pre-filled, with a small banner: *"Extracted from your photo — check the
   names and units before saving."* Low-confidence rows are visually flagged.
6. The tailor edits freely and taps **Save** → the existing
   `useCreateTemplate` path (`finalizeTemplateFields` already trims, dedups, and
   derives `key`). Nothing new on save.
7. Offer to **attach the photo** to the template as a reference image (reuse
   `TemplateImagesEditor` — it already stores into `designs`), or discard the
   scratch upload.

### States & failure

- **Scanning**: a labeled progress state — *"Reading your template…"* — not a
  bare spinner. (This is an async AI job, not a list fetch, so a progress
  message with the picked image dimmed behind it is the right pattern rather
  than a data skeleton.)
- **AI disabled (`503`)**: the endpoint returns 503 when the server has no
  `ANTHROPIC_API_KEY`. UI shows *"Scanning isn't available right now — you can
  still build the template by hand,"* and opens the empty New Template form.
- **Nothing readable / empty `items`**: *"Couldn't read any measurements from
  that photo. Try a clearer, straight-on shot — or add them by hand."* with a
  retry and a manual-entry fallback.

---

## Feature B — Scan a client's filled sheet

**Goal:** a client who's far away sends a photo of their filled measurement
sheet; the tailor scans it into a `MeasurementSet` for that client — and can
optionally promote its layout to a reusable template.

### Entry point

From the **client detail screen** (`clients/[id].tsx`): **Add measurements →
Scan from photo**. Starting from the client means `clientId` is known, which is
exactly what a `MeasurementSet` needs. (A future variant could start from a
loose photo and pick/create the client afterward — noted, not in scope here.)

### Flow

1. On a client's screen, tap **Add measurements → Scan from photo** → **Take
   photo** or **Choose from library**.
2. Compress + upload as in Feature A. A client sheet is legitimately part of the
   order record, so store it durably (e.g. under the client/measurement area
   rather than a scratch path) so it stays as an audit trail of where the
   numbers came from.
3. Call `ai.extractMeasurements({ storagePath, mode: 'measurements' })`.
4. **Review screen — the important one.** Show the extracted `label ↔ value`
   pairs in a list *next to (or above) the original photo*, so the tailor can
   eyeball the page against the parsed numbers in seconds. Each row: label
   (editable), value (editable, numeric), unit. Low-confidence rows are flagged.
   A single **unit toggle** (cm/in) defaults to the tailor's / client's
   `unitPreference` and applies to rows without their own unit — because a bare
   "38" doesn't say cm or inches.
5. **Save** → create a `MeasurementSet` on that client via the existing
   measurement-sets path: `{ clientId, values, unitPreference, label }`, where
   `values` is the `{ key: number }` map (keys derived from labels exactly like
   templates do, so a set and a template built from the same page line up).
6. **Promote to template (optional).** On the review screen or right after save,
   offer **"Also save this as a template."** This strips every `value`, reuses
   `finalizeTemplateFields` on the labels/units, and creates a
   `MeasurementTemplate` — the same save path as Feature A. Before creating,
   **dedupe against existing templates** (compare the sorted set of field keys):
   if an equivalent template already exists, offer *"You already have a matching
   template — use it?"* instead of making a near-duplicate.

### Why the numbers deserve extra care

Handwritten digits are harder to read than printed labels, and a wrong value is
a garment that doesn't fit — so for `mode: 'measurements'` the review step is
non-negotiable, the source photo is shown alongside, and low-confidence rows are
highlighted. This is also why `mode` selects a stronger model for this path (see
below).

### States & failure

Same three states as Feature A (scanning / `503` / nothing-readable), with the
manual fallback being the existing hand-entry measurement form pre-selected for
that client.

---

## Backend work (the one new capability)

All in the existing `ai` module — no new module, no DB migration.

1. **`ai.service.ts` → add `extractMeasurements(tailorId, storagePath, mode)`.**
   - Same guard clauses as `describeImage`: `503` if `this.client` is null;
     `BadRequestException` if `storagePath.split('/')[0] !== tailorId`.
   - Reuse `loadImage()` verbatim to get `{ base64, mediaType }`. (Note: it
     currently infers the bucket from path segment `[1]` being `designs` else
     `order-photos` — make sure the scan upload path lands in a bucket it can
     read, or extend that inference if you add a measurements bucket.)
   - New system prompts, one per mode. Ask for **strict JSON only** and use the
     SDK's tool-use / structured-output so the model must return the shape (more
     reliable than parsing free text). Validate the result with
     `AiExtractMeasurementsResponseSchema` before returning; on parse failure,
     return `items: []` rather than throwing, so the UI shows the clean
     "couldn't read it" state.
   - Prompt intent:
     - `template`: *"Read every measurement NAME on this form. Ignore any
       numbers or blank lines. Return the names in order, with a unit only if
       one is printed."* → `value: null` on every item.
     - `measurements`: *"Read each measurement line as a name and its number.
       If a line has no number, return value null. Do not invent numbers. Note
       the unit if the sheet states one."*
   - **Model:** keep Haiku (`claude-haiku-4-5-*`, already used) for `template`;
     use a stronger model (e.g. a Sonnet string) for `measurements` where
     handwriting accuracy matters. Bump `MAX_TOKENS` (a long booklet page can
     exceed 512) — ~1024–1536.
2. **`ai.controller.ts` → add `POST /ai/extract-measurements`**, mirroring
   `describe-image`: resolve `tailorId` via `requireTailorId`, pass body through.
3. **`ai.dto.ts` → add `ExtractMeasurementsDto`**, exactly like the existing
   ones: `export class ExtractMeasurementsDto extends
   createZodDto(AiExtractMeasurementsRequestSchema) {}`.
4. **Schemas + api-client**: add the schemas/types and the `extractMeasurements`
   client method shown above, then rebuild both packages.

No changes to `measurement_templates`, `measurement_sets`, or any other table.

---

## The label-matching layer (accuracy + consistency)

Raw OCR labels vary ("Chest", "chest", "Poitrine", "Tour de poitrine", "Bust").
To keep scanned templates consistent with hand-built ones, normalize each
extracted `label` against the app's existing vocabulary before it hits the
editor.

- Build a lookup once from `MEASUREMENT_GROUPS` in `lib/measurements.ts`,
  resolving every `measurements.*` key in **both** `en` and `fr` → canonical
  key. Add a small hand-maintained **synonyms/abbreviations** table for common
  variants and French phrasings the vocabulary doesn't cover verbatim (e.g.
  "tour de poitrine" → chest, "épaule" → shoulder).
- `matchMeasurementLabel(raw): { label, matched: boolean }` — on a hit, use the
  tailor's localized canonical name; on a miss, keep the raw label as-is (never
  drop it) and let the tailor rename it. Unmatched rows are a fine outcome, not
  an error.
- Do this **client-side** — the app owns the i18n dictionary and the active
  locale. The endpoint stays locale-agnostic and returns exactly what it read.

---

## Cross-cutting: conventions, privacy, cost

- **i18n (mandatory, en + fr).** Every new string — buttons ("Scan a template",
  "Take photo", "Choose from library", "Add measurements"), the review banner,
  progress and error messages, the promote/dedupe prompts — goes through `t()`
  with both locales, per `CLAUDE.md`. New keys land in `templates.ts`,
  `clients.ts`, `measurements.ts`, and `common.ts` under
  `lib/i18n/locales/`; the `npm run i18n:check` guard must pass.
- **Skeletons vs progress.** The pre-filled forms render from local state, so
  per the skeleton rule they're exempt (like the other `*/new.tsx` forms). The
  *scanning* step is an AI job — use a labeled progress indicator, not a data
  skeleton and not a bare spinner.
- **Privacy / storage.** Scans are photos of a person's body measurements —
  keep them in the tailor-scoped buckets under RLS, exactly like order photos.
  For Feature A, the blank-page scan is disposable: attach it as a template
  reference image only if the tailor opts in, else delete the scratch upload.
  For Feature B, keep the sheet with the measurement set as provenance.
- **Cost.** One image call per scan, and only when the tailor explicitly taps
  scan. Haiku keeps Feature A near-free; Feature B's stronger model is the
  deliberate spend where accuracy matters. `503`-when-unconfigured means this
  ships dark and turns on with the API key — no half-states.

---

## Build checklist

**Shared foundation**

- [ ] Add `AiExtractMode`, request/response + item Zod schemas to
      `packages/schemas/src/ai.ts` (already re-exported via `export * from
      './ai'`, so no index edit needed); rebuild.
- [ ] Add `ai.extractMeasurements()` to `packages/api-client`; rebuild.
- [ ] `ai.service.ts`: `extractMeasurements()` with per-mode prompts, structured
      output, schema validation, model-per-mode, higher `MAX_TOKENS`.
- [ ] `ai.controller.ts` + `ai.dto.ts`: `POST /ai/extract-measurements`.
- [ ] Confirm the scan upload path lands in a bucket `loadImage()` can read.
- [ ] `matchMeasurementLabel()` helper + synonyms table in `lib/measurements.ts`.
- [ ] Shared image-picker + upload + "scanning…" progress component.
- [ ] i18n keys (en + fr) for every new string; `i18n:check` green.

**Feature A — blank template**

- [ ] "Scan a template" entry on `templates/new.tsx` and `templates/index.tsx`.
- [ ] Extract (`mode: 'template'`) → map to `EditableField[]` → pre-fill the
      fields editor with a review banner + low-confidence flags.
- [ ] Optional "attach photo as reference image"; discard scratch upload otherwise.
- [ ] `503` / empty-result fallbacks to manual entry.

**Feature B — filled client sheet**

- [ ] "Add measurements → Scan from photo" on `clients/[id].tsx`.
- [ ] Extract (`mode: 'measurements'`) → review screen with label↔value pairs
      beside the photo, editable values, unit toggle (default `unitPreference`).
- [ ] Save as `MeasurementSet` on the client.
- [ ] "Also save as a template" → strip values → dedupe vs existing → create
      template.
- [ ] Same fallbacks as Feature A.

**Verify**

- [ ] Test with real booklet pages: printed, handwritten, photocopied, French
      and English, cm and inch, and a deliberately messy shot.
- [ ] Confirm no auto-save path exists — every scan lands on an editable form.
- [ ] `npm run lint` (incl. `i18n:check`) and the api-client/schemas builds pass.

---

## If you only remember three things

1. **It's one extraction with two uses.** A blank page and a filled sheet are
   the same read; `mode` and "keep the values or not" are the only difference.
   One endpoint, two entry points.
2. **Extract → review → save, always.** Never auto-save. The tailor lands on a
   normal, editable SeamFlow form; the photo just fills it in. For filled
   sheets, show the photo next to the numbers.
3. **Reuse, don't rebuild.** The AI service, the template + measurement-set
   models, the form editors, and the localized measurement vocabulary already
   exist. The real new code is one `extractMeasurements` endpoint plus the
   label-matching helper.
