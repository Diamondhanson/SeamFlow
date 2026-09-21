'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { replyToTicket, setTicketStatus, type ReplyState, type SupportStatus } from '../../../../lib/support-actions';

const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/**
 * Two ways to send: the usual "Send" hands the ticket to the user (waiting on
 * them); "Send & resolve" answers and closes in one step. Either pushes the
 * user a notification.
 */
export function ReplyBox({ ticketId, status }: { ticketId: string; status: SupportStatus }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToTicket, { error: null, sentAt: null });
  const formRef = useRef<HTMLFormElement>(null);
  // One idempotency key per draft: a double submit posts once.
  const [clientId, setClientId] = useState(newKey);

  useEffect(() => {
    if (state.sentAt) {
      formRef.current?.reset();
      setClientId(newKey());
    }
  }, [state.sentAt]);

  return (
    <form ref={formRef} action={action} className="border-t border-ruleStrong pt-5">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="clientId" value={clientId} />
      <label className="block">
        <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">
          {status === 'resolved' ? 'Reply — this ticket is resolved; “Send” reopens it for the user' : 'Reply'}
        </span>
        <textarea
          name="body"
          rows={5}
          required
          maxLength={4000}
          placeholder="Write to the user. They get a push notification."
          className="w-full border border-rule bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
        />
      </label>
      {state.error ? <p className="mt-2 text-xs text-bad">{state.error}</p> : null}
      {state.sentAt && !pending ? <p className="mt-2 text-xs text-good">Sent. The user has been notified.</p> : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="submit"
          name="status"
          value="waiting_on_user"
          disabled={pending}
          className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
        <button
          type="submit"
          name="status"
          value="resolved"
          disabled={pending}
          className="border border-rule px-4 py-2 text-sm text-ink hover:border-ink disabled:opacity-60"
        >
          Send &amp; resolve
        </button>
      </div>
    </form>
  );
}

const STATUSES: { value: SupportStatus; label: string }[] = [
  { value: 'open', label: 'Needs reply' },
  { value: 'waiting_on_user', label: 'Waiting on user' },
  { value: 'resolved', label: 'Resolved' },
];

export function StatusButtons({ ticketId, status }: { ticketId: string; status: SupportStatus }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <div className="flex flex-col border border-rule">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={pending || s.value === status}
            aria-pressed={s.value === status}
            onClick={() =>
              start(async () => {
                setError(null);
                try {
                  await setTicketStatus(ticketId, s.value);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              })
            }
            className={`border-b border-rule px-3 py-2 text-left text-sm last:border-b-0 ${
              s.value === status ? 'bg-primary text-white' : 'bg-paper text-muted hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-bad">{error}</p> : null}
    </div>
  );
}
