import Link from 'next/link';
import { Cell, Empty, PageHeader, Row, Table, Tag } from '../../../components/primitives';
import { FilterBar, Search } from '../../../components/filters';
import { label, relative } from '../../../lib/format';
import { getInbox, INBOX_TABS, type InboxTab } from '../../../lib/queries/support';

export const dynamic = 'force-dynamic';

export default async function SupportInbox({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: InboxTab = INBOX_TABS.some((t) => t.key === sp.tab) ? (sp.tab as InboxTab) : 'open';
  const q = sp.q ?? '';
  const { counts, rows } = await getInbox(tab, q);

  const tabHref = (key: InboxTab) => {
    const p = new URLSearchParams();
    if (key !== 'open') p.set('tab', key);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `/support?${s}` : '/support';
  };

  return (
    <>
      <PageHeader
        title="Support"
        lede="Tickets from tailors and clients. Needs reply is the queue, oldest first: whatever has waited longest is at the top."
        right={`${counts.open} waiting on us`}
      />

      <nav className="mb-5 flex flex-wrap border-b border-rule" aria-label="Ticket status">
        {INBOX_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active ? 'border-primary font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
              <span className={`ml-2 font-mono tnum text-xs ${t.key === 'open' && counts.open > 0 ? 'text-bad' : 'text-faint'}`}>
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      <FilterBar>
        <Search placeholder="SF-1042, subject, name or email" />
      </FilterBar>

      {rows.length === 0 ? (
        <Empty>{q ? 'No tickets match that search.' : tab === 'open' ? 'Nothing waiting on us.' : 'No tickets here.'}</Empty>
      ) : (
        <Table head={['Ticket', 'From', 'Subject', 'Status', 'Last activity']} align={['left', 'left', 'left', 'left', 'right']}>
          {rows.map((r) => (
            <Row key={r.id}>
              <td className="whitespace-nowrap px-3 py-2.5 align-top">
                <Link
                  href={`/support/${r.id}`}
                  className="font-mono tnum text-[0.8125rem] font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-primary"
                >
                  SF-{r.number}
                </Link>
                {r.unread > 0 ? (
                  <span className="ml-2 text-2xs uppercase tracking-widest text-bad" title="New message from the user">
                    new
                  </span>
                ) : null}
              </td>
              <Cell>
                {r.who}
                <span className="mt-0.5 block text-xs text-faint">
                  {r.side === 'tailor' ? 'Tailor' : 'Client'}
                  {r.email ? ` · ${r.email}` : ''}
                </span>
              </Cell>
              <Cell wide>
                <Link href={`/support/${r.id}`} className="font-medium text-ink hover:text-primary">
                  {r.subject}
                </Link>
                <span className="mt-0.5 block text-xs text-muted">
                  {label(r.category)}
                  {r.orderName ? ` · ${r.orderName}` : ''}
                  {r.preview ? ` — ${r.preview}` : ''}
                </span>
              </Cell>
              <Cell>
                <Tag>{label(r.status)}</Tag>
              </Cell>
              <Cell right dim mono>
                {relative(r.lastMessageAt)}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
