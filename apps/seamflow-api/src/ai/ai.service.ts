import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseService } from '../supabase/supabase.service';
import {
  DESIGN_ATTRIBUTES,
  DESIGN_COLORS,
  DesignClassificationSchema,
  ExtractedMeasurementItemSchema,
  normalizeAttributes,
  normalizeColorKeys,
  GARMENT_TYPES,
  type DesignClassification,
  type AiDescribeImageResponse,
  type AiDescribeMode,
  type AiExtractMeasurementsResponse,
  type AiExtractMode,
  type AiSummarizeNotesResponse,
  type ExtractedMeasurementItem,
} from '@seamflow/schemas';

// ----------------------------------------------------------------------------
// No prompt caching in this file, deliberately.
//
// Caching only engages above a per-model minimum prefix, and silently does
// nothing below it — no error, just `cache_creation_input_tokens: 0`. Measured
// with the token-counting endpoint on 2026-08-27:
//
//   describeImage / tags / fabric  113 tokens   vs Haiku 4.5's 4096 minimum
//   summarizeNotes                 ~130 tokens  vs Haiku 4.5's 4096 minimum
//   extractMeasurements            858 tokens   vs Sonnet 5's 1024 minimum
//
// Every one is far below its threshold, and each request carries a different
// image anyway, so there is no repeated prefix worth caching even in principle.
// Adding cache_control here would be decoration that costs a cache-write
// premium and returns nothing. The assistant is the one path with a prefix
// big enough to matter (3,152 tokens of tool schemas) — see
// assistant.service.ts.
//
// If these prompts ever grow past the minimums, re-measure before adding it.
// ----------------------------------------------------------------------------

// Haiku 4.5 — fast + cheap, ideal for describing a single image. Swap to a
// Sonnet model string if you want richer specs at higher cost.
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;

// Measurement extraction: printed label lists are easy (Haiku), handwritten
// numbers on a client's filled sheet are not — a misread digit is a garment
// that doesn't fit, so that mode pays for a stronger model. A long booklet
// page can be 30+ lines, so extraction gets a bigger token budget too.
const EXTRACT_MODELS: Record<AiExtractMode, string> = {
  template: MODEL,
  measurements: 'claude-sonnet-5',
};
const EXTRACT_MAX_TOKENS = 1536;

// Per-mode system prompt. Kept terse and tailor-domain-specific.
const SYSTEM_PROMPTS: Record<AiDescribeMode, string> = {
  spec: `You are a master tailor's assistant. Look at the garment or design in the image and write a concise construction spec: garment type, silhouette, neckline, sleeves, notable details, and print/pattern. 2–4 sentences. Describe only what is visible; do not invent measurements or fabric composition you cannot see. Plain prose only — no markdown, no asterisks, no headings, no bullet lists.`,
  fabric: `You are a master tailor's assistant. Describe the fabric in the image: dominant colours, pattern/motif, apparent weight and texture, and 2–3 garments it would suit. 2–3 sentences. Describe only what is visible; hedge material guesses ("appears to be…"). Plain prose only — no markdown, no asterisks, no headings, no bullet lists.`,
  tags: `You are a tagging assistant for a tailor's inspiration library. Return 4–8 short lowercase tags (garment type, silhouette, neckline, fabric, occasion) as a single comma-separated line. No sentences, no extra text.`,
};

const INSTRUCTIONS: Record<AiDescribeMode, string> = {
  spec: 'Describe this design as a short construction spec.',
  fabric: 'Describe this fabric.',
  tags: 'Give comma-separated tags for this image.',
};

// "Tidy up" — turn a tailor's rough scribbled order notes into a clean, ordered
// summary a client could read. Preserve every concrete detail; never invent.
const SUMMARIZE_SYSTEM = `You are a master tailor's assistant. Rewrite the tailor's rough order notes into a clean, well-organized summary that a client could read and confirm. Keep EVERY concrete detail they wrote — garment(s), colours, fabric, any measurements or numbers, deadlines, and special requests. Group related points and use short bullet-style lines. Do NOT invent details, sizes, or dates that are not in the notes. Do not add commentary or a preamble — return only the tidied notes.`;

// ============================================================================
// Scan-to-measurement (docs/measurement-scan-plan.md).
//
// One extraction, two uses: a blank booklet page (mode 'template') yields
// measurement NAMES; a client's filled sheet (mode 'measurements') yields
// name + number pairs. The model is forced through a tool call so the reply
// is structured JSON, then each item is validated individually — a single
// malformed row is dropped, not the whole page.
// ============================================================================

const EXTRACT_SYSTEMS: Record<AiExtractMode, string> = {
  template: `You are reading a tailor's paper measurement form (a blank template page). Extract every measurement NAME printed or written on it, in the order they appear on the page. Ignore any filled-in numbers and any blank value cells — return value null for every item. Record a unit ('cm' or 'in') on an item only if one is explicitly printed for that line; if the page states a single unit for everything, put it in detectedUnit instead. Labels may be in English or French — return them exactly as written, do not translate. Skip page furniture (titles, dates, client-name lines, phone numbers). Mark confidence 'low' for any line you could not read clearly.`,
  measurements: `You are reading a client's filled-in measurement sheet for a tailor. Extract every measurement line as its NAME and its handwritten NUMBER. If a line has no number, return value null — do NOT invent or guess numbers, ever. Read numbers carefully: they may be handwritten, and a misread digit ruins a garment. Record a unit ('cm' or 'in') on an item only if written for that line; if the sheet states one unit overall, put it in detectedUnit. Labels may be in English or French — return them exactly as written, do not translate. Skip page furniture (titles, dates, client-name lines, phone numbers). Mark confidence 'low' whenever a name or number is hard to read.`,
};

const EXTRACT_INSTRUCTIONS: Record<AiExtractMode, string> = {
  template: 'Extract the measurement names on this form.',
  measurements: 'Extract the measurement names and their values from this sheet.',
};

// Forced tool call — the SDK's structured-output path. The schema mirrors
// AiExtractMeasurementsResponseSchema (minus `mode`, which the server echoes).
const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'record_measurements',
  description: 'Record the measurement lines read from the page.',
  input_schema: {
    type: 'object',
    properties: {
      detectedUnit: {
        enum: ['cm', 'in', null],
        description: "Page-level unit if the sheet states one, else null.",
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'The name exactly as read.' },
            unit: { enum: ['cm', 'in', null] },
            value: {
              type: ['number', 'null'],
              description: 'The number on the line, or null when blank.',
            },
            confidence: { enum: ['high', 'low'] },
          },
          required: ['label', 'unit', 'value'],
        },
      },
    },
    required: ['items'],
  },
};

// ============================================================================
// Design classification — the intake half of feed search.
//
// The publish screen used to be five empty text boxes. Of 38 designs published
// through it, zero carried a tag and garment_type had fragmented into "dress",
// "gown", "set" and "cover-up". People do not fill in boxes; they tap chips.
//
// So the model proposes and the tailor corrects. The critical constraint is
// that it may ONLY propose from our vocabularies — an enum per field, built
// from the same arrays the app renders. A free-text answer here would recreate
// exactly the fragmentation this replaces, so the enums are generated rather
// than written out, and widening a vocabulary widens the prompt automatically.
//
// Haiku, like the other single-image paths: this is "name what you see from a
// fixed list", not reasoning, and it runs while the tailor watches.
// ============================================================================

const CLASSIFY_MAX_TOKENS = 768;

const CLASSIFY_SYSTEM = `You are a tagging assistant for a tailor's public design feed in West and Central Africa. You will see one photo of a finished garment. Describe ONLY what is visible.

Rules:
- Every field must come from the allowed values in the tool schema. Never invent a value.
- If the tailor's own words are supplied, TRUST THEM over your reading of the photo. They made the garment. If they call it a kaftan, it is a kaftan; if they say boat neck, use boat neck.
- Prefer a specific West/Central African garment name (kaftan, agbada, boubou, kaba, senator, buba) over a generic one (dress, gown, set) when the garment is clearly that piece.
- Colours: at most 3, most dominant first. Use "multicolour" ONLY on its own, for a busy print with no dominant colour — never alongside named colours.
- Attributes: at most ONE shape, ONE length, ONE sleeve and ONE neckline. Details may be many. Emit the ones you are most confident about first.
- Only what you can SEE. Four accurate attributes beat ten guessed ones. Omit a group entirely rather than guess it.
- title: 2-4 words, the kind of name a tailor would give the piece. No punctuation.
- caption: one short sentence a shopper would read. No hashtags, no emoji, no markdown.
- If the photo is not of a garment, return nulls and empty arrays.`;

const CLASSIFY_INSTRUCTION =
  'Classify this design for the feed using the allowed values only.';

/**
 * Built from the vocabularies rather than hand-written, so the model can never
 * be offered a value the app cannot render, and adding a colour or attribute
 * needs no prompt edit.
 */
const CLASSIFY_TOOL: Anthropic.Tool = {
  name: 'classify_design',
  description: 'Record the garment, colours and style attributes visible in the photo.',
  input_schema: {
    type: 'object',
    properties: {
      garmentKey: {
        enum: [...GARMENT_TYPES.map((g) => g.key), null],
        description: 'The garment taxonomy key, or null if unclear.',
      },
      audience: { enum: ['women', 'men', 'unisex', 'children', null] },
      occasion: {
        enum: ['wedding', 'traditional', 'corporate', 'casual', 'party', null],
      },
      fabric: {
        type: ['string', 'null'],
        description:
          'Fabric if recognisable (ankara, lace, brocade, chiffon, linen…), else null.',
      },
      colors: {
        type: 'array',
        maxItems: 3,
        items: { enum: DESIGN_COLORS.map((c) => c.key) },
        description: 'Dominant colours first.',
      },
      attributes: {
        type: 'array',
        maxItems: 8,
        items: { enum: DESIGN_ATTRIBUTES.map((a) => a.key) },
        description: 'Only attributes clearly visible in the photo.',
      },
      title: { type: ['string', 'null'], description: '2-4 word name.' },
      caption: { type: ['string', 'null'], description: 'One short sentence.' },
    },
    required: ['colors', 'attributes'],
  },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI auto-describe is disabled.');
    }
  }

  async describeImage(
    tailorId: string,
    storagePath: string,
    mode: AiDescribeMode,
  ): Promise<AiDescribeImageResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }
    // Belt-and-suspenders: the object must live under this tailor's folder.
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException('storagePath does not belong to this tailor.');
    }

    const { base64, mediaType } = await this.loadImage(storagePath);

    const msg = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPTS[mode],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: INSTRUCTIONS[mode] },
          ],
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (mode === 'tags') {
      const tags = text
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      return { mode, text, tags };
    }
    return { mode, text };
  }

  /**
   * Look at one design photo and propose how to file it.
   *
   * NOTHING here is stored directly — every value goes back to the publish
   * screen as a pre-selected chip the tailor can remove. That is what makes a
   * wrong guess cheap: the worst case is a tap, versus the current worst case
   * of an empty tags column on every row.
   *
   * Field-by-field validation rather than all-or-nothing: if the model returns
   * one attribute key we do not recognise, we drop that key and keep the rest.
   * A single bad chip should not cost the tailor the other seven.
   */
  async classifyDesign(
    storagePath: string,
    bucketOverride?: string,
    /**
     * What the tailor has already told us — a caption they typed, or the
     * garment type from the order this photo came off.
     *
     * This is the single biggest accuracy lever, and it was measured: without
     * it the model read a photo captioned "ankle-length striped kaftan" as a
     * wrapper set, and a "boat neck with three-quarter sleeves" as
     * off-shoulder. The tailor sewed the thing. Their words win.
     */
    hint?: { caption?: string | null; garmentType?: string | null },
  ): Promise<DesignClassification> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }

    const { base64, mediaType } = await this.loadImage(storagePath, bucketOverride);

    const msg = await this.client.messages.create({
      model: MODEL,
      max_tokens: CLASSIFY_MAX_TOKENS,
      system: CLASSIFY_SYSTEM,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: CLASSIFY_TOOL.name },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: buildClassifyInstruction(hint) },
          ],
        },
      ],
    });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    const raw = (toolUse?.input ?? {}) as Record<string, unknown>;

    // Salvage per field. `catch` on the whole object would throw away a good
    // classification because of one unknown enum member.
    const empty: DesignClassification = {
      garmentKey: null,
      audience: null,
      occasion: null,
      fabric: null,
      colors: [],
      attributes: [],
      title: null,
      caption: null,
    };

    const parsed = DesignClassificationSchema.safeParse({
      ...empty,
      ...raw,
      // Normalised, not just filtered: the prompt asks for one sleeve and one
      // neckline, but a prompt is a request and this is the guarantee.
      colors: normalizeColorKeys(keepKnown(raw.colors, DESIGN_COLORS.map((c) => c.key))),
      attributes: normalizeAttributes(
        keepKnown(raw.attributes, DESIGN_ATTRIBUTES.map((a) => a.key)),
      ),
    });

    if (!parsed.success) {
      this.logger.warn(
        `classify-design returned an unusable payload: ${parsed.error.message}`,
      );
      return empty;
    }
    return parsed.data;
  }

  /**
   * Tidy up a tailor's rough order notes into a clean, ordered summary. Same
   * 503-when-unconfigured contract as describeImage; text-only.
   */
  async summarizeNotes(notes: string): Promise<AiSummarizeNotesResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }
    const msg = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SUMMARIZE_SYSTEM,
      messages: [{ role: 'user', content: [{ type: 'text', text: notes }] }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return { text };
  }

  /**
   * Read a photo of a measurement page and return the measurement lines on it,
   * structured. Never writes anything — the app lands the result on an
   * editable form for the tailor to review and save. Same guards + 503
   * contract as describeImage. On an unparseable model reply, returns
   * `items: []` (the app's "couldn't read it" state) rather than throwing.
   */
  async extractMeasurements(
    tailorId: string,
    storagePath: string,
    mode: AiExtractMode,
  ): Promise<AiExtractMeasurementsResponse> {
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException('storagePath does not belong to this tailor.');
    }
    return this.runExtract(storagePath, mode);
  }

  /**
   * Consumer-side scan (client app): the customer uploads a photo of a filled
   * sheet to the `requests` bucket under their own user id, then we extract it.
   * Same AI path as the tailor scanner; ownership is by the user-id path prefix.
   */
  async extractMeasurementsForUser(
    userId: string,
    storagePath: string,
    mode: AiExtractMode,
  ): Promise<AiExtractMeasurementsResponse> {
    if (storagePath.split('/')[0] !== userId) {
      throw new BadRequestException('storagePath does not belong to this user.');
    }
    return this.runExtract(storagePath, mode, 'requests');
  }

  private async runExtract(
    storagePath: string,
    mode: AiExtractMode,
    bucketOverride?: string,
  ): Promise<AiExtractMeasurementsResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }

    const { base64, mediaType } = await this.loadImage(storagePath, bucketOverride);

    const msg = await this.client.messages.create({
      model: EXTRACT_MODELS[mode],
      max_tokens: EXTRACT_MAX_TOKENS,
      system: EXTRACT_SYSTEMS[mode],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: EXTRACT_TOOL.name },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: EXTRACT_INSTRUCTIONS[mode] },
          ],
        },
      ],
    });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    const raw = (toolUse?.input ?? {}) as {
      detectedUnit?: unknown;
      items?: unknown;
    };

    const detectedUnit =
      raw.detectedUnit === 'cm' || raw.detectedUnit === 'in' ? raw.detectedUnit : null;

    // Validate row-by-row so one malformed line drops just that line. In
    // template mode the values are noise by contract — null them out.
    const items: ExtractedMeasurementItem[] = [];
    if (Array.isArray(raw.items)) {
      for (const it of raw.items) {
        const parsed = ExtractedMeasurementItemSchema.safeParse(it);
        if (parsed.success) {
          items.push(
            mode === 'template' ? { ...parsed.data, value: null } : parsed.data,
          );
        }
      }
    }
    if (Array.isArray(raw.items) && items.length < raw.items.length) {
      this.logger.warn(
        `extract-measurements dropped ${raw.items.length - items.length} malformed row(s).`,
      );
    }

    return { mode, detectedUnit, items };
  }

  /**
   * Read the object from whichever bucket it lives in (inferred from the
   * path — designs, templates and fabrics all live in the `designs` bucket,
   * everything else in `order-photos`) and return it as base64 + a
   * Claude-supported media type.
   */
  private async loadImage(
    storagePath: string,
    bucketOverride?: string,
  ): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
    const area = storagePath.split('/')[1];
    const bucket =
      bucketOverride ??
      (area === 'designs' || area === 'templates' || area === 'fabrics'
        ? 'designs'
        : 'order-photos');
    const dl = await this.supabase.admin().storage.from(bucket).download(storagePath);
    if (dl.error || !dl.data) {
      throw new BadRequestException(
        `Could not read image ${storagePath}: ${dl.error?.message ?? 'missing'}`,
      );
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    return { base64: buf.toString('base64'), mediaType: sniffImageType(buf, storagePath) };
  }
}

/**
 * Determine an image's real type from its magic bytes.
 *
 * This used to read the file EXTENSION, defaulting to `image/webp`. That is a
 * trap, because the extension is chosen by the client and clients get it wrong:
 * iOS Safari has no WebP encoder, and `canvas.toBlob(cb, 'image/webp')` is
 * required by spec to silently substitute PNG rather than fail. The app then
 * stored PNG bytes under a `.webp` name, we declared `image/webp` to Claude,
 * and Claude rejected the mismatch — a 500 on iOS web only.
 *
 * Sniffing also repairs the objects already written that way: nothing needs
 * renaming, because the bytes were always the truth.
 */
function sniffImageType(
  buf: Buffer,
  storagePath: string,
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  // PNG  \x89 P N G \r \n \x1a \n
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) return 'image/png';
  // JPEG  FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF  "GIF8"
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  // WebP  "RIFF" .... "WEBP"  (size field sits between the two)
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // Anything else — HEIC being the likely one from an iPhone — cannot be sent
  // to Claude at all. Fail with something a human can act on rather than
  // guessing a type and letting the upstream 400 surface as an opaque 500.
  const head = buf.subarray(0, 12).toString('hex');
  throw new BadRequestException(
    `Unsupported image format for ${storagePath} (magic ${head}). ` +
      'Claude accepts JPEG, PNG, GIF and WebP.',
  );
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Drop anything the vocabulary does not contain, and de-duplicate. */
function keepKnown(value: unknown, allowed: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const set = new Set(allowed);
  return [...new Set(value.filter((v): v is string => typeof v === 'string' && set.has(v)))];
}

/**
 * The user-turn text. Folds in whatever the tailor has already said so the
 * model is correcting a description rather than inventing one from pixels.
 */
function buildClassifyInstruction(hint?: {
  caption?: string | null;
  garmentType?: string | null;
}): string {
  const said: string[] = [];
  if (hint?.garmentType?.trim()) said.push(`calls it a "${hint.garmentType.trim()}"`);
  if (hint?.caption?.trim()) said.push(`describes it as: "${hint.caption.trim().slice(0, 300)}"`);

  if (!said.length) return CLASSIFY_INSTRUCTION;
  return `The tailor who made this ${said.join(', and ')}. Trust that over your own reading where they disagree.\n\n${CLASSIFY_INSTRUCTION}`;
}
