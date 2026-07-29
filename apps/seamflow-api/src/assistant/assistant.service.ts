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

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      const msg = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(),
        tools: this.toolsService.anthropicDefs,
        // Final round: force a text answer so a long chain still ends usefully.
        ...(lastRound ? { tool_choice: { type: 'none' as const } } : {}),
        messages,
      });

      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const toolUses = msg.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (msg.stop_reason !== 'tool_use' || toolUses.length === 0) {
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
}
