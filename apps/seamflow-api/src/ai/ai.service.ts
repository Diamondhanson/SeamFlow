import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  AiDescribeImageResponse,
  AiDescribeMode,
  AiSummarizeNotesResponse,
} from '@seamflow/schemas';

// Haiku 4.5 — fast + cheap, ideal for describing a single image. Swap to a
// Sonnet model string if you want richer specs at higher cost.
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;

// Per-mode system prompt. Kept terse and tailor-domain-specific.
const SYSTEM_PROMPTS: Record<AiDescribeMode, string> = {
  spec: `You are a master tailor's assistant. Look at the garment or design in the image and write a concise construction spec: garment type, silhouette, neckline, sleeves, notable details, and print/pattern. 2–4 sentences. Describe only what is visible; do not invent measurements or fabric composition you cannot see.`,
  fabric: `You are a master tailor's assistant. Describe the fabric in the image: dominant colours, pattern/motif, apparent weight and texture, and 2–3 garments it would suit. 2–3 sentences. Describe only what is visible; hedge material guesses ("appears to be…").`,
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
   * Read the object from whichever bucket it lives in (designs vs order-photos,
   * inferred from the path) and return it as base64 + a Claude-supported media
   * type.
   */
  private async loadImage(
    storagePath: string,
  ): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
    const bucket = storagePath.split('/')[1] === 'designs' ? 'designs' : 'order-photos';
    const dl = await this.supabase.admin().storage.from(bucket).download(storagePath);
    if (dl.error || !dl.data) {
      throw new BadRequestException(
        `Could not read image ${storagePath}: ${dl.error?.message ?? 'missing'}`,
      );
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const mediaType =
      ext === 'png'
        ? 'image/png'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'image/webp';
    return { base64: buf.toString('base64'), mediaType };
  }
}
