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
  ExtractedMeasurementItemSchema,
  type AiDescribeImageResponse,
  type AiDescribeMode,
  type AiExtractMeasurementsResponse,
  type AiExtractMode,
  type AiSummarizeNotesResponse,
  type ExtractedMeasurementItem,
} from '@seamflow/schemas';

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
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }
    if (storagePath.split('/')[0] !== tailorId) {
      throw new BadRequestException('storagePath does not belong to this tailor.');
    }

    const { base64, mediaType } = await this.loadImage(storagePath);

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
  ): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
    const area = storagePath.split('/')[1];
    const bucket =
      area === 'designs' || area === 'templates' || area === 'fabrics'
        ? 'designs'
        : 'order-photos';
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
