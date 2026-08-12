import Link from 'next/link';
import { Cell, Empty, LinkCell, Note, PageHeader, Row, Section, Stat, StatRow, Table, Tag } from '../../components/primitives';
import { dateTime, label, num } from '../../lib/format';
import { getEnquiries } from '../../lib/queries/enquiries';

export const dynamic = 'force-dynamic';

export default async function EnquiriesPage() {
  const { counts, rows, byOrigin } = await getEnquiries();

  return (
    <>
      <PageHeader
        title="Enquiries"
        lede="Conversations between a client account and a tailor. This is the demand side's only channel into the tailor app."
        right={`${num(counts.conversations)} conversations`}
      />

      <Section title="Volume">
        <StatRow cols={5}>
          <Stat label="Conversations" value={num(counts.conversations)} tone={counts.conversations === 0 ? 'bad' : 'ink'} />
          <Stat label="Messages" value={num(counts.messages)} tone={counts.messages === 0 ? 'muted' : 'ink'} />
          <Stat label="Became a commission" value={num(counts.withOrder)} hint="the conversation has an order" />
          <Stat label="Unread by tailors" value={num(counts.unreadTailor)} tone={counts.unreadTailor > 0 ? 'bad' : 'muted'} />
          <Stat label="Unread by clients" value={num(counts.unreadClient)} tone="muted" />
        </StatRow>
      </Section>

      {counts.conversations === 0 ? (
        <Section title="Why this is empty" subtitle="Two things have to be true before a conversation can exist. Neither is.">
          <Table head={['Precondition', 'Current', 'Consequence']} align={['left', 'right', 'left']}>
            <Row>
              <Cell>Someone has an account in the client app</Cell>
              <Cell right mono>{num(counts.clientAccounts)}</Cell>
              <Cell dim wide>Nobody can start a conversation.</Cell>
            </Row>
            <Row>
              <Cell>Something is published for them to enquire about</Cell>
              <Cell right mono>{num(counts.published)}</Cell>
              <Cell dim wide>Even with an account, there is nothing to open a conversation from.</Cell>
            </Row>
          </Table>

          <Note tone="copper">
            These are not two independent problems. Nothing is published, so there is nothing to discover; with nothing
            to discover there is no reason to sign up. The chain starts at{' '}
            <Link href="/feed" className="underline underline-offset-4">publishing</Link> — fix that end and this page
            fills itself.
          </Note>
        </Section>
      ) : (
        <>
          {byOrigin.length > 0 ? (
            <Section title="How they started">
              <Table head={['Origin', 'Count']} align={['left', 'right']}>
                {byOrigin.map((o) => (
                  <Row key={o.key}>
                    <Cell>{label(o.label)}</Cell>
                    <Cell right mono>{o.value}</Cell>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}

          <Section title="Conversations" right={`${rows.length} shown`}>
            <Table
              head={['Client', 'Tailor', 'Origin', 'Messages', 'Unread (tailor)', 'Last message', 'Preview']}
              align={['left', 'left', 'left', 'right', 'right', 'right', 'left']}
            >
              {rows.map((r) => (
                <Row key={r.id}>
                  <Cell>{r.client ?? <span className="text-faint">unknown</span>}</Cell>
                  <LinkCell href={`/tailors/${r.tailorId}`}>{r.tailor}</LinkCell>
                  <Cell>
                    <Tag>{label(r.origin)}</Tag>
                    {r.orderId ? (
                      <Link href={`/orders/${r.orderId}`} className="ml-2 text-xs text-copper underline underline-offset-4">
                        order
                      </Link>
                    ) : null}
                  </Cell>
                  <Cell right mono>{r.messages}</Cell>
                  <Cell right mono>{r.tailorUnread > 0 ? <span className="text-bad">{r.tailorUnread}</span> : 0}</Cell>
                  <Cell right dim mono>{dateTime(r.lastMessageAt)}</Cell>
                  <Cell dim wide>{r.preview ?? '—'}</Cell>
                </Row>
              ))}
            </Table>
          </Section>
        </>
      )}

      {counts.conversations === 0 ? <Empty>No conversations to list.</Empty> : null}
    </>
  );
}
