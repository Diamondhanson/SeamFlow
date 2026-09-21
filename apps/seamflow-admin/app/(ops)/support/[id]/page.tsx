import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Facts, PageHeader, Section, Tag } from '../../../../components/primitives';
import { date, dateTime, label, relative } from '../../../../lib/format';
import { loadTicket } from '../../../../lib/support-actions';
import { getOtherTickets } from '../../../../lib/queries/support';
import { ReplyBox, StatusButtons } from './reply-box';

export const dynamic = 'force-dynamic';

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let detail;
  try {
    detail = await loadTicket(id);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('API 404')) notFound();
    throw err;
  }
  const { ticket, messages, requester } = detail;
  const others = await getOtherTickets(requester.userId, ticket.id);
  const who = requester.businessName || requester.fullName || requester.email || 'Unknown user';

  return (
    <>
      <PageHeader
        back={{ href: '/support', label: 'Support' }}
        title={`SF-${ticket.number}`}
        lede={ticket.subject}
        right={<Tag>{label(ticket.status)}</Tag>}
      />

      <Facts
        items={[
          ['From', <span key="f">{who}<span className="block text-xs text-faint">{ticket.side === 'tailor' ? 'Tailor app' : 'Client app'}</span></span>],
          ['Category', label(ticket.category)],
          ['Opened', dateTime(ticket.createdAt)],
          [
            'Order',
            ticket.orderId ? (
              <Link key="o" href={`/orders/${ticket.orderId}`} className="text-copper underline underline-offset-4">
                {ticket.orderName ?? 'View order'}
              </Link>
            ) : (
              <span key="o" className="text-faint">none linked</span>
            ),
          ],
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <ol className="space-y-5">
            {messages.map((m) => {
              const ours = m.sender === 'support';
              return (
                <li key={m.id} className={`border-l-2 pl-4 ${ours ? 'border-primary' : 'border-rule'}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-4 text-2xs uppercase tracking-widest">
                    <span className={ours ? 'text-primary' : 'text-faint'}>{ours ? 'SeamFlow Support' : who}</span>
                    <span className="font-mono tnum normal-case tracking-normal text-faint">{dateTime(m.createdAt)}</span>
                  </div>
                  {m.body ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p> : null}
                  {m.attachments.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) =>
                        a.url ? (
                          <a key={a.storagePath} href={a.url} target="_blank" rel="noreferrer" title="Open full size">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
                            <img
                              src={a.thumbnailUrl ?? a.url}
                              alt="Screenshot from the user"
                              className="h-40 w-auto border border-rule object-cover"
                            />
                          </a>
                        ) : (
                          <span key={a.storagePath} className="text-xs text-faint">screenshot unavailable</span>
                        ),
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-8">
            <ReplyBox ticketId={ticket.id} status={ticket.status} />
          </div>
        </div>

        <aside className="space-y-8">
          <Section title="Status">
            <StatusButtons ticketId={ticket.id} status={ticket.status} />
            {ticket.resolvedAt ? (
              <p className="mt-2 text-xs text-faint">Resolved {relative(ticket.resolvedAt)}</p>
            ) : null}
          </Section>

          <Section title="Person">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-2xs uppercase tracking-widest text-faint">Name</dt><dd>{requester.fullName || '—'}</dd></div>
              {requester.businessName ? (
                <div><dt className="text-2xs uppercase tracking-widest text-faint">Shop</dt><dd>{requester.businessName}</dd></div>
              ) : null}
              <div><dt className="text-2xs uppercase tracking-widest text-faint">Email</dt><dd className="break-all">{requester.email ?? '—'}</dd></div>
              <div><dt className="text-2xs uppercase tracking-widest text-faint">Phone</dt><dd>{requester.phone ?? '—'}</dd></div>
              <div><dt className="text-2xs uppercase tracking-widest text-faint">Joined</dt><dd>{date(requester.joinedAt)}</dd></div>
            </dl>
          </Section>

          {others.length ? (
            <Section title="Their other tickets">
              <ul className="space-y-2 text-sm">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/support/${o.id}`} className="font-mono tnum text-xs text-copper underline underline-offset-4">
                      SF-{o.number}
                    </Link>{' '}
                    <span className="text-muted">{o.subject}</span>
                    <span className="block text-2xs uppercase tracking-widest text-faint">{label(o.status)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
