import type { HttpClient } from '../http';
import type {
  Conversation,
  ConversationCreateInput,
  ConversationDetail,
  ConversationList,
  ConversationQuoteInput,
  ConversationQuoteResult,
  Message,
  MessageCreateInput,
  MessagePage,
  SaveChatMeasurementInput,
  SaveChatMeasurementResult,
  ShareOrderInput,
} from '@seamflow/schemas';

function toQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * In-app chat (ROADMAP D.2.3). Used by BOTH apps — the API resolves the
 * caller's role from the token and returns the other party as `counterparty`,
 * so neither app needs a role-specific code path.
 */
export function makeConversationsResource(http: HttpClient) {
  return {
    /**
     * Client-side "Inquire". Reuses an existing thread for the same
     * (client, tailor, design) rather than creating a duplicate.
     */
    create(input: ConversationCreateInput): Promise<Conversation> {
      return http.post<Conversation>('/conversations', input);
    },

    /** Role-aware list, newest activity first, with unread counts. */
    list(params: { cursor?: string; limit?: number } = {}): Promise<ConversationList> {
      return http.get<ConversationList>(`/conversations${toQuery(params)}`);
    },

    /** Thread header + first page of messages (newest first). */
    get(id: string, params: { limit?: number } = {}): Promise<ConversationDetail> {
      return http.get<ConversationDetail>(`/conversations/${id}${toQuery(params)}`);
    },

    /**
     * Messages. With `cursor`: older pages, walking backwards. With `since`
     * (a previous page's `syncedAt`): only what was created or changed after
     * it — how the device keeps its local copy current.
     */
    messages(
      id: string,
      params: { cursor?: string; limit?: number; since?: string } = {},
    ): Promise<MessagePage> {
      return http.get<MessagePage>(`/conversations/${id}/messages${toQuery(params)}`);
    },

    /** Re-fetch specific messages (fresh photo links). */
    hydrate(id: string, ids: string[]): Promise<{ items: Message[] }> {
      return http.post<{ items: Message[] }>(`/conversations/${id}/messages/hydrate`, { ids });
    },

    /**
     * Send. Pass a `clientId` minted on the device — the server de-duplicates
     * on it, so a retry after a timeout returns the original message instead
     * of posting a second copy. This is what makes the offline queue safe.
     */
    sendMessage(id: string, input: MessageCreateInput): Promise<Message> {
      return http.post<Message>(`/conversations/${id}/messages`, input);
    },

    /** Mark the thread read for the caller: clears their unread, stamps read_at. */
    markRead(id: string): Promise<{ unreadCount: number }> {
      return http.post<{ unreadCount: number }>(`/conversations/${id}/read`, {});
    },

    /**
     * Development only. Seeds a fake inbound enquiry so the chat loop can be
     * exercised before the client app exists. 403s in production.
     */
    simulateEnquiry(): Promise<Conversation> {
      return http.post<Conversation>('/conversations/simulate-enquiry', {});
    },

    /**
     * Tailor-only (phase C3). Turn the thread into a real commission: creates
     * the client if new, an order, and a draft invoice, then links them to the
     * conversation.
     */
    quote(id: string, input: ConversationQuoteInput): Promise<ConversationQuoteResult> {
      return http.post<ConversationQuoteResult>(`/conversations/${id}/quote`, input);
    },

    /**
     * Tailor-only. Keep a measurement the client sent into that client's file,
     * and link this thread to them so the next one needs no picker. The server
     * reads the numbers off the stored message, not off this request.
     */
    saveMeasurement(
      id: string,
      input: SaveChatMeasurementInput,
    ): Promise<SaveChatMeasurementResult> {
      return http.post<SaveChatMeasurementResult>(`/conversations/${id}/measurement-set`, input);
    },

    /** Toggle the caller's emoji reaction on a message; returns the updated message. */
    react(id: string, messageId: string, emoji: string): Promise<Message> {
      return http.post<Message>(`/conversations/${id}/messages/${messageId}/reactions`, { emoji });
    },

    /**
     * Tailor-only. Share an existing order into the thread — posts an order card
     * AND links the order to the client's account so it shows in their Orders list.
     */
    shareOrder(id: string, input: ShareOrderInput): Promise<Message> {
      return http.post<Message>(`/conversations/${id}/share-order`, input);
    },
  };
}

export type ConversationsResource = ReturnType<typeof makeConversationsResource>;
