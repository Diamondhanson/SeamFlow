// ============================================================================
// Tailor copilot — the agentic loop (docs/tailor-copilot-plan.md).
//
// One POST = one turn: send the conversation + tool defs to Claude; run read
// tools as it asks for them (tenant-scoped, trimmed projections); stop the
// moment it proposes a write and hand the ActionPreview back to the app for
// the confirm card. Bounded rounds; tool errors go BACK to the model (so it
// recovers or explains) instead of crashing the turn.
//
// Same 503-when-ANTHROPIC_API_KEY-unset contract as the ai module — this
// ships dark and lights up with the key.
// ============================================================================

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AssistantChatMessage,
  AssistantChatResponse,
} from '@seamflow/schemas';
import { AssistantToolsService, ToolArgError } from './assistant.tools';

// Sonnet, not Haiku: multi-step tool selection reasons noticeably better on
// Sonnet, and a chat turn is already several calls — precision saves rounds.
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;
// Runaway guard: at most this many tool rounds per turn, then one final
// tools-off call so the tailor always gets a text answer.
const MAX_ROUNDS = 6;
// The app resends history each turn (stateless server) — cap what we forward.
const MAX_HISTORY = 24;

/**
 * The stable half of every request.
 *
 * Rendered after `tools` and before `messages`, which is what lets one
 * cache breakpoint here cover the tool schemas too — they are 2,977 of the
 * 3,152 tokens in the cached prefix, and they are resent on every round of
 * every turn.
 *
 * The date interpolated below is deliberately date-only, never a timestamp.
 * A timestamp would change the bytes on every request and silently defeat the
 * cache; a date changes once at midnight, which costs one extra cache write a
 * day. Keep it that way — and if anything else dynamic is ever needed here
 * (tailor name, locale, feature flags), put it in the message stream instead,
 * because anything added to this string invalidates the tools cached ahead of
 * it. Sonnet 5 does not support mid-conversation `role: "system"` messages, so
 * that means a user-turn block.
 */
function systemPrompt(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const today = now.toISOString().slice(0, 10);
  return [
    "You are SeamFlow's assistant for a professional tailor. You help them look up their own clients, orders, measurements, invoices, fabrics and group orders, and you can propose actions (create/update orders, clients, measurements, invoices, share links) that the tailor confirms in the app before anything is saved.",
    `Today is ${weekday}, ${today}. Do date math yourself and pass dates as ISO (YYYY-MM-DD).`,
    'Rules:',
    '- Only use the tools for facts about their business. Never invent clients, orders, numbers or dates. If a tool returns nothing, say so plainly.',
    '- Write tools need resolved ids: search first (e.g. search_clients) to turn a name into an id. If several records match, ask which one before proposing.',
    '- When you propose an action, keep your message short — the app shows a confirmation card with the details; the tailor will confirm or cancel there.',
    "- Payment tracking isn't enabled yet: money questions answer from invoice balances (total minus deposit) — say so when it matters.",
    "- Reply in the tailor's language (their messages tell you). Be brief, warm and concrete — they're often mid-fitting with a phone in one hand.",
    '- Formatting: the app renders markdown. Bold the key facts (names, dates, amounts, statuses) so they stand out. Default to short plain sentences; use a heading, bullet list or small table only when it genuinely makes the answer clearer (e.g. several orders side by side) — this is a phone screen, so keep any structure compact. No code blocks.',
  ].join('\n');
}

/**
 * Return `messages` with a cache breakpoint on the very last content block.
 *
 * Caching is a prefix match, so a marker here caches everything before it —
 * tools, system, and the whole conversation up to this point. Each round of
 * the tool loop therefore reads the previous round's history rather than
 * paying full input price to resend it.
 *
 * Copies rather than mutates: `messages` is appended to as the loop runs, and
 * leaving stale `cache_control` markers on earlier turns would waste
 * breakpoints (the API allows four) on positions nothing reads from.
 */
function withCacheBreakpoint(
  messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] {
  const last = messages[messages.length - 1];
  if (!last) return messages;

  const head = messages.slice(0, -1);
  const mark = { type: 'ephemeral' as const };

  // History arrives as plain strings; the API treats a lone text block as
  // equivalent, and a block is the only thing cache_control can attach to.
  if (typeof last.content === 'string') {
    return [
      ...head,
      {
        role: last.role,
        content: [{ type: 'text', text: last.content, cache_control: mark }],
      },
    ];
  }

  const blocks = [...last.content];
  const tail = blocks[blocks.length - 1];
  // Not every block type accepts cache_control — a thinking block, for one,
  // rejects it. Skip rather than force it: a missed breakpoint costs a little
  // money, an invalid request costs the whole turn.
  if (!tail || !CACHEABLE_BLOCKS.has(tail.type)) return messages;

  blocks[blocks.length - 1] = {
    ...tail,
    cache_control: mark,
  } as Anthropic.ContentBlockParam;
  return [...head, { role: last.role, content: blocks }];
}

/** Block types that carry `cache_control`. */
const CACHEABLE_BLOCKS = new Set<string>([
  'text',
  'image',
  'document',
  'tool_use',
  'tool_result',
]);

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly config: ConfigService,
    private readonly toolsService: AssistantToolsService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — assistant chat is disabled.');
    }
  }

  async chat(
    tailorId: string,
    history: AssistantChatMessage[],
  ): Promise<AssistantChatResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
      );
    }

    const ctx = { tailorId };
    const toolsUsed: string[] = [];
    const messages: Anthropic.MessageParam[] = history
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));

    // Built once per turn, not once per round. Two reasons: the bytes must be
    // identical across rounds for the cache to hit, and a turn that straddles
    // midnight would otherwise change the date mid-conversation and re-write
    // the whole prefix.
    const system: Anthropic.TextBlockParam[] = [
      {
        type: 'text',
        text: systemPrompt(),
        // Caches `tools` + `system` together — 3,152 tokens that are otherwise
        // resent at full price on every round. A cache read costs 10% of input.
        cache_control: { type: 'ephemeral' },
      },
    ];
    const tools = this.toolsService.anthropicDefs;

    let cacheRead = 0;
    let cacheWritten = 0;
    let uncached = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools,
        // Final round: force a text answer so a long chain still ends usefully.
        ...(lastRound ? { tool_choice: { type: 'none' as const } } : {}),
        // Second breakpoint, rolling: caches the conversation so far, so each
        // round reads the previous round's tool results instead of re-sending
        // them at full price. Cheap here because a tool result is often a long
        // JSON blob.
        messages: withCacheBreakpoint(messages),
      });

      cacheRead += msg.usage.cache_read_input_tokens ?? 0;
      cacheWritten += msg.usage.cache_creation_input_tokens ?? 0;
      uncached += msg.usage.input_tokens;

      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const toolUses = msg.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (msg.stop_reason !== 'tool_use' || toolUses.length === 0) {
        this.logCache(cacheRead, cacheWritten, uncached, round + 1);
        return { reply: text, pendingAction: null, toolsUsed };
      }

      // A write proposal ends the turn: preview it and hand it to the app.
      // (If the preview itself fails — bad id, illegal transition — the error
      // goes back to the model as a tool result so it can recover.)
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const tool = this.toolsService.byName(tu.name);
        const args = (tu.input ?? {}) as Record<string, unknown>;
        if (!tool) {
          results.push(this.toolError(tu.id, `Unknown tool: ${tu.name}`));
          continue;
        }
        if (tool.kind === 'write' && tool.preview) {
          try {
            const preview = await tool.preview(ctx, args);
            this.logCache(cacheRead, cacheWritten, uncached, round + 1);
            return { reply: text, pendingAction: preview, toolsUsed };
          } catch (err) {
            results.push(this.toolError(tu.id, this.errMessage(err)));
            continue;
          }
        }
        if (tool.kind === 'read' && tool.run) {
          try {
            const data = await tool.run(ctx, args);
            toolsUsed.push(tool.name);
            results.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify(data),
            });
          } catch (err) {
            results.push(this.toolError(tu.id, this.errMessage(err)));
          }
        }
      }

      messages.push({ role: 'assistant', content: msg.content });
      messages.push({ role: 'user', content: results });
    }

    // Unreachable in practice (the last round forces tools off), but never
    // leave the tailor with nothing.
    return {
      reply: '',
      pendingAction: null,
      toolsUsed,
    };
  }

  private toolError(toolUseId: string, message: string): Anthropic.ToolResultBlockParam {
    return {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: message,
      is_error: true,
    };
  }

  private errMessage(err: unknown): string {
    if (err instanceof ToolArgError) return err.message;
    if (err instanceof Error) {
      // NestJS HttpExceptions (NotFound etc.) carry a useful message; anything
      // else gets a generic line so internals don't leak into the model.
      const name = err.constructor?.name ?? '';
      if (name.endsWith('Exception')) return err.message;
      this.logger.warn(`assistant tool failed: ${err.message}`);
    }
    return 'The lookup failed — tell the tailor and suggest trying again.';
  }

  /**
   * Record what the cache actually did.
   *
   * Prompt caching fails silently — a stray byte in the prefix produces a
   * working assistant with a quietly tripled bill and no error anywhere. A
   * hit rate in the logs is the only way that surfaces, so log it every turn
   * and treat a zero read count across a multi-round turn as a bug.
   */
  private logCache(read: number, written: number, uncached: number, rounds: number): void {
    const billable = read + written + uncached;
    if (billable === 0) return;
    const pct = Math.round((read / billable) * 100);
    this.logger.log(
      `assistant turn: ${rounds} round(s), input ${billable} tok ` +
        `(${read} cached read, ${written} cache write, ${uncached} uncached) — ${pct}% from cache`,
    );
    if (rounds > 1 && read === 0) {
      this.logger.warn(
        'Prompt cache never hit across a multi-round turn — the prefix is changing between rounds. ' +
          'Check that tools, model and the system prompt are byte-identical (see systemPrompt()).',
      );
    }
  }

}
