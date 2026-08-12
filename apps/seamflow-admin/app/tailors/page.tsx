import { Suspense } from 'react';
import { Columns } from '../../components/charts';
import { Choice, FilterBar, Reset, Search } from '../../components/filters';
import { Cell, Empty, Flag, LinkCell, PageHeader, Pagination, Row, Section, Stat, StatRow, Table } from '../../components/primitives';
import { date, money, num } from '../../lib/format';
import { getTailors, type TailorSort } from '../../lib/queries/tailors';
import { PAGE_SIZE, parsePage } from '../../lib/queries/shared';

export const dynamic = 'force-dynamic';

const SORTS: { value: TailorSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'orders', label: 'Most orders' },
  { value: 'clients', label: 'Most clients' },
  { value: 'billed', label: 'Most billed' },
  { value: 'name', label: 'Name A–Z' },
];

export default async function TailorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { rows, total, signups, countries } = await getTailors({
    q: sp.q,
    country: sp.country,
    sort: (sp.sort as TailorSort) || 'recent',
    page,
  });

  const active = rows.filter((t) => t.orders > 0).length;
  const publishing = rows.filter((t) => t.published > 0).length;
  const qs = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    next.set('page', String(p));
    return `?${next}`;
  };

  return (
    <>
      <PageHeader
        title="Tailors"
        lede="The supply side. Every business account, what they have created, and whether any of it reached the public feed."
        right={`${num(total)} total`}
      />

      <Suspense fallback={null}>
        <FilterBar>
          <Search placeholder="Business name or city…" />
          <Choice name="country" label="Country" options={countries} />
          <Choice name="sort" label="Sort" options={SORTS} allLabel="Newest first" />
          <Reset />
        </FilterBar>
      </Suspense>

      <Section title="Signups" subtitle="New tailor accounts per month.">
        <Columns data={signups} unit="Tailors" />
      </Section>

      <Section title="On this page" subtitle="Counts for the rows currently shown, not the whole platform.">
        <StatRow cols={4}>
          <Stat label="Shown" value={num(rows.length)} />
          <Stat label="Have taken an order" value={num(active)} hint={`of ${rows.length} shown`} />
          <Stat
            label="Have published work"
            value={num(publishing)}
            tone={publishing === 0 ? 'bad' : 'ink'}
            hint="reachable from the client app"
          />
          <Stat label="Countries" value={num(countries.length)} tone="muted" />
        </StatRow>
      </Section>

      <Section title="All tailors" subtitle="Click a business to open its full record.">
        {rows.length === 0 ? (
          <Empty>No tailors match these filters.</Empty>
        ) : (
          <>
            <Table
              head={['Business', 'Where', 'Cur.', 'Clients', 'Orders', 'Invoices', 'Billed', 'Published', 'Last order']}
              align={['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right']}
            >
              {rows.map((t) => (
                <Row key={t.id}>
                  <LinkCell
                    href={`/tailors/${t.id}`}
                    sub={
                      <>
                        joined {date(t.createdAt)}
                        {t.isVerified ? ' · verified' : ''}
                      </>
                    }
                  >
                    {t.businessName}
                  </LinkCell>
                  <Cell dim>{t.city ?? t.countryCode}</Cell>
                  <Cell dim mono>{t.currency}</Cell>
                  <Cell right mono>{t.clients}</Cell>
                  <Cell right mono>{t.orders}</Cell>
                  <Cell right mono>{t.invoices}</Cell>
                  <Cell right mono>{t.billed > 0 ? money(t.billed, t.currency) : <span className="text-faint">—</span>}</Cell>
                  <Cell right mono>
                    {t.published === 0 ? <Flag severity="idle" label="none" /> : t.published}
                  </Cell>
                  <Cell right dim mono>{date(t.lastOrderAt)}</Cell>
                </Row>
              ))}
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} make={qs} />
          </>
        )}
      </Section>
    </>
  );
}
