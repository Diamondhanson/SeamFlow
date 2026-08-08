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

    /** Older messages, walking backwards via the previous page's cursor. */
    messages(
      id: string,
      params: { cursor?: string; limit?: number } = {},
    ): Promise<MessagePage> {
      return http.get<MessagePage>(`/conversations/${id}/messages${toQuery(params)}`);
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
  };
}

export type ConversationsResource = ReturnType<typeof makeConversationsResource>;
