import { z } from 'zod';

// ============================================================================
// Tailor copilot — chat assistant over the tailor's own data.
// (docs/tailor-copilot-plan.md)
//
// The server runs an agentic tool loop; READ tools execute immediately
// (tenant-scoped), WRITE tools never execute server-side — they come back as
// a `pendingAction` (ActionPreview) that the app renders as a confirm card
// and, on confirm, executes through the normal api-client call for that tool.
//
// Conversation state is on-device only: the app persists the thread locally
// and resends recent history each turn. Nothing is stored server-side.
// ============================================================================

export const AssistantRoleSchema = z.enum(['user', 'assistant']);
export type AssistantRole = z.infer<typeof AssistantRoleSchema>;

export const AssistantChatMessageSchema = z.object({
  role: AssistantRoleSchema,
  content: z.string().min(1).max(4000),
});
export type AssistantChatMessage = z.infer<typeof AssistantChatMessageSchema>;

/**
 * A proposed write action. `args` is exactly what the app passes to the
 * matching api-client call on confirm; `display` carries resolved human
 * names (e.g. clientName) so the app composes the localized confirm card
 * from structured values — never from model prose.
 */
export const ActionPreviewSchema = z.object({
  /** Correlation id for this proposal (uuid). */
  id: z.string(),
  /** Registry tool name, e.g. 'create_order'. The app maps it to a call. */
  tool: z.string(),
  /** Validated arguments to execute with on confirm. */
  args: z.record(z.string(), z.unknown()),
  /** Resolved display values for the confirm card (clientName, orderName…). */
  display: z.record(z.string(), z.string()),
  /** Problems worth showing on the card (e.g. an unusual status jump). */
  warnings: z.array(z.string()).default([]),
});
export type ActionPreview = z.infer<typeof ActionPreviewSchema>;

/** Body for POST /assistant/chat. The app sends recent history (capped). */
export const AssistantChatRequestSchema = z.object({
  messages: z.array(AssistantChatMessageSchema).min(1).max(40),
});
export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>;

export const AssistantChatResponseSchema = z.object({
  /** The assistant's reply text for this turn. */
  reply: z.string(),
  /** Set when the model proposed a write — the app must confirm to execute. */
  pendingAction: ActionPreviewSchema.nullable(),
  /** Read tools that ran this turn — lets the UI caption the work done. */
  toolsUsed: z.array(z.string()),
});
export type AssistantChatResponse = z.infer<typeof AssistantChatResponseSchema>;
