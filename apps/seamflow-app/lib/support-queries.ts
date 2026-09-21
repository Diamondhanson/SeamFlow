// ============================================================================
// Help & Support — queries and mutations, shared by the tailor and client
// sides (the API scopes everything to the signed-in user, so neither side
// passes an id of its own).
//
// No realtime yet: SeamFlow's replies come from the admin inbox (plan step 2),
// which will also send a push. Until then an open thread refreshes on a slow
// interval, and the list refreshes on focus like every other screen.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SupportMessageCreateInput,
  SupportTicketCreateInput,
  SupportTicketDetail,
} from '@seamflow/schemas';
import { api } from './api';
import { qk } from './query-keys';

/** How often an open thread checks for a reply while on screen. */
const THREAD_REFRESH_MS = 30_000;

// staleTime 0: the app-wide default (5 min) meant a reply that arrived just
// after the user last looked stayed invisible for up to five minutes, even
// across a refresh, because the saved copy still counted as fresh. Opening
// the list or a ticket must always ask.
export const useSupportTickets = () =>
  useQuery({ queryKey: qk.supportTickets(), queryFn: () => api.support.list(), staleTime: 0 });

export const useSupportTicket = (id: string) =>
  useQuery({
    queryKey: qk.supportTicket(id),
    queryFn: () => api.support.get(id),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: THREAD_REFRESH_MS,
  });

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportTicketCreateInput) => api.support.create(input),
    onSuccess: (detail) => {
      qc.setQueryData(qk.supportTicket(detail.ticket.id), detail);
      void qc.invalidateQueries({ queryKey: qk.supportTickets() });
    },
  });
}

export function useReplySupportTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupportMessageCreateInput) => api.support.reply(id, input),
    onSuccess: (msg) => {
      // Append in place (a reply also reopens the ticket), then reconcile.
      qc.setQueryData<SupportTicketDetail>(qk.supportTicket(id), (cur) =>
        cur && !cur.messages.some((m) => m.id === msg.id)
          ? { ticket: { ...cur.ticket, status: 'open', resolvedAt: null }, messages: [...cur.messages, msg] }
          : cur,
      );
      void qc.invalidateQueries({ queryKey: qk.supportTicket(id) });
      void qc.invalidateQueries({ queryKey: qk.supportTickets() });
    },
  });
}

export function useResolveSupportTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.support.resolve(id),
    onSuccess: (ticket) => {
      qc.setQueryData<SupportTicketDetail>(qk.supportTicket(id), (cur) =>
        cur ? { ...cur, ticket } : cur,
      );
      void qc.invalidateQueries({ queryKey: qk.supportTickets() });
    },
  });
}

/** Idempotency key for a ticket or reply — minted once per attempt. */
export function newSupportClientId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
