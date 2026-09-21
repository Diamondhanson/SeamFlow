import type { HttpClient } from '../http';
import type {
  SupportMessage,
  SupportMessageCreateInput,
  SupportTicket,
  SupportTicketCreateInput,
  SupportTicketDetail,
} from '@seamflow/schemas';

export interface ListSupportTicketsResponse {
  items: SupportTicket[];
}

/** Help & Support — the signed-in user's own tickets (tailor or client). */
export function makeSupportResource(http: HttpClient) {
  return {
    list(): Promise<ListSupportTicketsResponse> {
      return http.get<ListSupportTicketsResponse>('/support/tickets');
    },
    create(input: SupportTicketCreateInput): Promise<SupportTicketDetail> {
      return http.post<SupportTicketDetail>('/support/tickets', input);
    },
    get(id: string): Promise<SupportTicketDetail> {
      return http.get<SupportTicketDetail>(`/support/tickets/${id}`);
    },
    reply(id: string, input: SupportMessageCreateInput): Promise<SupportMessage> {
      return http.post<SupportMessage>(`/support/tickets/${id}/messages`, input);
    },
    resolve(id: string): Promise<SupportTicket> {
      return http.patch<SupportTicket>(`/support/tickets/${id}`, { status: 'resolved' });
    },
  };
}

export type SupportResource = ReturnType<typeof makeSupportResource>;
