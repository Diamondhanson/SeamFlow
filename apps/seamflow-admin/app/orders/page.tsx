import { Suspense } from 'react';
import { Columns, HBars } from '../../components/charts';
import { Choice, FilterBar, Range, Reset, Search } from '../../components/filters';
import { Cell, Empty, Flag, LinkCell, PageHeader, Pagination, Row, Section, Stat, StatRow, Table, Tag } from '../../components/primitives';
import { date, label, num, relative } from '../../lib/format';
import { ORDER_STATUS_COLOR } from '../../lib/palette';
import { getOrders } from '../../lib/queries/orders';
import { PAGE_SIZE, parsePage, parseRange } from '../../lib/queries/shared';

export const dynamic = 'force-dynamic';

const STATUSES = ['registered', 'in_progress', 'testing', 'on_pause', 'delivered'].map((v) => ({
  value: v,
  label: label(v),
}));

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { rows, total, monthly, statuses, tailors } = await getOrders({
    q: sp.q,
    status: sp.status,
    tailor: sp.tailor,
    range: parseRange(sp.range),
    page,
  });

  const overdue = rows.filter(
    (o) => o.dateDelivery && new Date(o.dateDelivery) < new Date() && o.status !== 'delivered',
  ).length;
  const noDue = rows.filter((o) => !o.dateDelivery).length;
  const withPhotos = rows.filter((o) => o.photos > 0).length;

  const qs = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    next.set('page', String(p));
    return `?${next}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        lede="Every order across every tailor. Filters apply to the charts as well as the table, so the two never disagree."
        right={`${num(total)} matching`}
      />

      <Suspense fallback={null}>
        <FilterBar>
          <Search placeholder="Order name…" />
          <Choice name="status" label="Status" options={STATUSES} />
          <Choice name="tailor" label="Tailor" options={tailors} />
          <Range />
          <Reset />
        </FilterBar>
      </Suspense>

      <Section title="Snapshot" subtitle="Across the rows on this page.">
        <StatRow cols={4}>
          <Stat label="Matching orders" value={num(total)} />
          <Stat label="Past their delivery date" value={num(overdue)} tone={overdue > 0 ? 'bad' : 'muted'} hint="and not marked delivered" />
          <Stat label="No delivery date" value={num(noDue)} tone="muted" hint="excluded from reminders" />
          <Stat label="Carrying a photo" value={num(withPhotos)} hint="the only ones that can be published" />
        </StatRow>
      </Section>

      <Section title="Created per month">
        <Columns data={monthly} unit="Orders" />
      </Section>

      <Section title="By status" subtitle="Of the filtered set, not the whole platform.">
        <HBars data={statuses.map((s) => ({ ...s, label: label(s.label) }))} colors={ORDER_STATUS_COLOR} />
      </Section>

      <Section title="All orders">
        {rows.length === 0 ? (
          <Empty>No orders match these filters.</Empty>
        ) : (
          <>
            <Table
              head={['Order', 'Tailor', 'Client', 'Status', 'Items', 'Photos', 'Invoice', 'Delivery', 'Created']}
              align={['left', 'left', 'left', 'left', 'right', 'right', 'left', 'right', 'right']}
            >
              {rows.map((o) => {
                const late = o.dateDelivery && new Date(o.dateDelivery) < new Date() && o.status !== 'delivered';
                return (
                  <Row key={o.id}>
                    <LinkCell href={`/orders/${o.id}`} sub={o.claimed ? 'claimed in the client app' : undefined}>
                      {o.name}
                    </LinkCell>
                    <LinkCell href={`/tailors/${o.tailorId}`}>{o.tailor}</LinkCell>
                    <Cell dim>{o.client ?? '—'}</Cell>
                    <Cell><Tag>{label(o.status)}</Tag></Cell>
                    <Cell right mono>{o.items}</Cell>
                    <Cell right mono>{o.photos === 0 ? <span className="text-faint">0</span> : o.photos}</Cell>
                    <Cell>
                      {o.invoiceId ? (
                        <LinkCellInline href={`/invoices/${o.invoiceId}`}>{o.invoiceNumber}</LinkCellInline>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Cell>
                    <Cell right mono dim={!late}>
                      {o.dateDelivery ? (
                        late ? <Flag severity="warn" label={relative(o.dateDelivery)} /> : relative(o.dateDelivery)
                      ) : (
                        '—'
                      )}
                    </Cell>
                    <Cell right dim mono>{date(o.createdAt)}</Cell>
                  </Row>
                );
              })}
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} make={qs} />
          </>
        )}
      </Section>
    </>
  );
}

/** A link inside an existing cell — `LinkCell` renders its own <td>. */
function LinkCellInline({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-ink underline decoration-rule underline-offset-4 hover:decoration-primary">
      {children}
    </a>
  );
}
