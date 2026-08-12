import { Suspense } from 'react';
import { Columns, Meter } from '../../components/charts';
import { Choice, FilterBar, Reset, Search } from '../../components/filters';
import { Cell, Empty, Flag, LinkCell, Note, PageHeader, Pagination, Row, Section, Table, Tag } from '../../components/primitives';
import { date, money, num } from '../../lib/format';
import { getInvoices } from '../../lib/queries/invoices';
import { parsePage } from '../../lib/queries/shared';

export const dynamic = 'force-dynamic';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { rows, total, facets, currencies, tailors } = await getInvoices({
    q: sp.q,
    currency: sp.currency,
    status: sp.status,
    tailor: sp.tailor,
    page,
  });

  const qs = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    next.set('page', String(p));
    return `?${next}`;
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        lede="Money, grouped by currency and never summed across. There is no exchange-rate source in this system, so a combined total would be a number that looks authoritative and means nothing."
        right={`${num(total)} matching`}
      />

      <Suspense fallback={null}>
        <FilterBar>
          <Search placeholder="Invoice number…" />
          <Choice name="currency" label="Currency" options={currencies} />
          <Choice name="status" label="Status" options={STATUSES} />
          <Choice name="tailor" label="Tailor" options={tailors} />
          <Reset />
        </FilterBar>
      </Suspense>

      {/* Faceted rather than a single chart with a series per currency: the two
          scales are unrelated (5,000 XAF and 5,000 NGN are different amounts of
          money), so plotting them on one axis would invite exactly the
          comparison the rest of this page refuses to make. */}
      <Section title="By currency" subtitle="One panel per currency. Totals below are for the whole platform, not the filtered set.">
        {facets.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            {facets.map((f) => (
              <div key={f.currency ?? 'none'}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-display text-lg font-semibold">
                    {f.currency ?? <span className="text-bad">No currency set</span>}
                  </span>
                  <span className="text-2xs uppercase tracking-widest text-faint">
                    {f.invoices} {f.invoices === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>
                <div className="mb-4 text-3xl font-semibold leading-none tracking-tight">
                  {money(f.billed, f.currency)}
                </div>
                <Meter
                  parts={[
                    { label: 'Deposits', value: f.deposits, formatted: money(f.deposits, f.currency), tone: 'filled' },
                    { label: 'Outstanding', value: f.outstanding, formatted: money(f.outstanding, f.currency), tone: 'track' },
                  ]}
                />
                <div className="mt-6">
                  <Columns
                    data={f.monthly}
                    height={110}
                    unit="Billed"
                    currency={f.currency}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="All invoices" subtitle="Computed is Σ quantity × unit price from the stored line items — it should always equal the total.">
        {rows.length === 0 ? (
          <Empty>No invoices match these filters.</Empty>
        ) : (
          <>
            <Table
              head={['Number', 'Tailor', 'Order', 'Status', 'Lines', 'Total', 'Computed', 'Deposit', 'Outstanding', 'Created']}
              align={['left', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right']}
            >
              {rows.map((i) => {
                const mismatch = Math.abs(i.total - i.computed) > 0.005;
                return (
                  <Row key={i.id}>
                    <LinkCell href={`/invoices/${i.id}`}>{i.number}</LinkCell>
                    <LinkCell href={`/tailors/${i.tailorId}`}>{i.tailor}</LinkCell>
                    <Cell dim>
                      {i.orderId ? (
                        <a href={`/orders/${i.orderId}`} className="underline decoration-rule underline-offset-4 hover:decoration-primary">
                          {i.orderName}
                        </a>
                      ) : (
                        '—'
                      )}
                    </Cell>
                    <Cell><Tag>{i.status}</Tag></Cell>
                    <Cell right mono>{i.lines}</Cell>
                    <Cell right mono>{money(i.total, i.currency)}</Cell>
                    <Cell right mono dim={!mismatch}>
                      {mismatch ? (
                        <span className="text-bad">{money(i.computed, i.currency)}</span>
                      ) : (
                        <Flag severity="ok" label="matches" />
                      )}
                    </Cell>
                    <Cell right mono dim>{money(i.deposit, i.currency)}</Cell>
                    <Cell right mono>{money(i.outstanding, i.currency)}</Cell>
                    <Cell right dim mono>{date(i.createdAt)}</Cell>
                  </Row>
                );
              })}
            </Table>
            <Pagination page={page} pageSize={40} total={total} make={qs} />
          </>
        )}
      </Section>

      <Note>
        Invoice numbers are issued per tailor, not globally, so two different tailors can each hold an
        &ldquo;INV-0001&rdquo;. The number alone does not identify an invoice — the tailor column beside it does.
      </Note>
    </>
  );
}
