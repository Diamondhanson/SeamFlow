import { Suspense } from 'react';
import { Choice, FilterBar, Reset, Search } from '../../components/filters';
import { Cell, Empty, Flag, LinkCell, Note, PageHeader, Pagination, Row, Section, Stat, StatRow, Table } from '../../components/primitives';
import { date, num } from '../../lib/format';
import { getClients } from '../../lib/queries/clients';
import { parsePage } from '../../lib/queries/shared';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { crm, crmTotal, accounts, accountsTotal, tailors, overlap } = await getClients({
    q: sp.q,
    tailor: sp.tailor,
    page,
  });

  const dupes = crm.filter((c) => c.duplicate).length;
  const placeholders = crm.filter((c) => c.placeholder).length;
  const qs = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    next.set('page', String(p));
    return `?${next}`;
  };

  return (
    <>
      <PageHeader
        title="Clients"
        lede="Two separate populations, shown separately because nothing in the schema joins them."
        right={`${num(crmTotal)} CRM · ${num(accountsTotal)} accounts`}
      />

      <Section title="The two populations">
        <StatRow cols={4}>
          <Stat label="CRM clients" value={num(crmTotal)} hint="typed into a tailor's address book" />
          <Stat
            label="Client accounts"
            value={num(accountsTotal)}
            hint="signed up in the consumer app"
            tone={accountsTotal === 0 ? 'bad' : 'ink'}
          />
          <Stat label="Phone matches between them" value={num(overlap.length)} tone="muted" hint="the only available evidence of overlap" />
          {/* Rows, not groups. Data health counts the REDUNDANT rows — the ones
              a merge would delete — so the two numbers differ by the number of
              groups, on purpose. Both are labelled for what they measure. */}
          <Stat
            label="Rows flagged as duplicates"
            value={num(dupes)}
            tone={dupes > 0 ? 'bad' : 'muted'}
            hint="every row sharing a phone, originals included"
            href="/health"
          />
        </StatRow>

        <Note>
          <strong className="font-semibold text-ink">There is no foreign key between these tables.</strong> A CRM row is
          created by a tailor typing a name; an account is created by a person signing up. Nothing reconciles them, so
          the same human can exist in both with no link — and a client who signs up cannot see the order history their
          tailor already has for them.
        </Note>
      </Section>

      <Suspense fallback={null}>
        <FilterBar>
          <Search placeholder="Name, phone or email…" />
          <Choice name="tailor" label="Tailor" options={tailors} />
          <Reset />
        </FilterBar>
      </Suspense>

      <Section
        title="CRM clients"
        subtitle="Address-book entries owned by a tailor. These people have no login and cannot see anything."
        right={`${num(crmTotal)} total${placeholders ? ` · ${placeholders} with placeholder details` : ''}`}
      >
        {crm.length === 0 ? (
          <Empty>No clients match these filters.</Empty>
        ) : (
          <>
            <Table
              head={['Name', 'Tailor', 'Phone', 'Email', 'Orders', 'Measurements', 'Added', '']}
              align={['left', 'left', 'left', 'left', 'right', 'right', 'right', 'left']}
            >
              {crm.map((c) => (
                <Row key={c.id}>
                  <Cell>{c.fullName}</Cell>
                  <LinkCell href={`/tailors/${c.tailorId}`}>{c.tailor}</LinkCell>
                  <Cell dim mono>
                    {c.phone === '—' ? <span className="text-warn">placeholder</span> : c.phone ?? '—'}
                  </Cell>
                  <Cell dim>{c.email ?? '—'}</Cell>
                  <Cell right mono>{c.orders}</Cell>
                  <Cell right mono>{c.measurementSets}</Cell>
                  <Cell right dim mono>{date(c.createdAt)}</Cell>
                  <Cell>{c.duplicate ? <Flag severity="warn" label="duplicate" /> : null}</Cell>
                </Row>
              ))}
            </Table>
            <Pagination page={page} pageSize={40} total={crmTotal} make={qs} />
          </>
        )}
      </Section>

      <Section
        title="Client accounts"
        subtitle="People who signed up in the consumer app. Filters above do not apply here — this list is short enough not to need them."
        right={`${num(accountsTotal)} total`}
      >
        {accounts.length === 0 ? (
          <Empty>
            Nobody has signed up in the client app yet. With zero designs published to the feed there is nothing for
            them to discover, so this is a consequence rather than an independent problem.
          </Empty>
        ) : (
          <Table
            head={['Name', 'Email', 'Phone', 'Verified', 'Claims', 'Enquiries', 'Devices', 'Joined']}
            align={['left', 'left', 'left', 'left', 'right', 'right', 'right', 'right']}
          >
            {accounts.map((a) => (
              <Row key={a.id}>
                <Cell>{a.fullName || <span className="text-warn">no name set</span>}</Cell>
                <Cell dim>{a.email ?? '—'}</Cell>
                <Cell dim mono>{a.phone ?? '—'}</Cell>
                <Cell>
                  {a.phoneVerifiedAt ? <Flag severity="ok" label="verified" /> : <Flag severity="idle" label="no" />}
                </Cell>
                <Cell right mono>{a.claims}</Cell>
                <Cell right mono>{a.conversations}</Cell>
                <Cell right mono>{a.devices === 0 ? <span className="text-faint">0</span> : a.devices}</Cell>
                <Cell right dim mono>{date(a.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {overlap.length > 0 ? (
        <Section
          title="Same phone in both populations"
          subtitle="An exact phone match is the only evidence available that a CRM row and an account are the same person. Shown as evidence, not as a link — the app does not know about it."
        >
          <Table head={['Phone', 'CRM name', 'Account name', 'Account email']} align={['left', 'left', 'left', 'left']}>
            {overlap.map((o, i) => (
              <Row key={`${o.phone}-${i}`}>
                <Cell mono>{o.phone}</Cell>
                <Cell>{o.crmName}</Cell>
                <Cell dim>{o.accountName ?? '—'}</Cell>
                <Cell dim>{o.accountEmail ?? '—'}</Cell>
              </Row>
            ))}
          </Table>
        </Section>
      ) : null}
    </>
  );
}
