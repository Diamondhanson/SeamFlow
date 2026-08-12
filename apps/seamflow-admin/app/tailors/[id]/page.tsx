import { notFound } from 'next/navigation';
import { Columns, HBars } from '../../../components/charts';
import { Cell, Empty, Facts, LinkCell, Note, PageHeader, Row, Section, Stat, StatRow, Table, Tag } from '../../../components/primitives';
import { date, label, money, num, relative } from '../../../lib/format';
import { ORDER_STATUS_COLOR } from '../../../lib/palette';
import { getTailor } from '../../../lib/queries/tailors';

export const dynamic = 'force-dynamic';

export default async function TailorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getTailor(id);
  if (!data) notFound();

  const { tailor: t, stats, ordersMonthly, statuses, orders, invoices, clients } = data;
  const cur = t.currency;

  return (
    <>
      <PageHeader
        title={t.businessName}
        back={{ href: '/tailors', label: 'All tailors' }}
        lede={t.bio ?? undefined}
        right={<>joined {date(t.createdAt)}{t.isVerified ? ' · verified' : ''}</>}
      />

      <Section title="Account">
        <Facts
          items={[
            ['Owner', t.fullName || <span className="text-faint">not set</span>],
            ['Email', t.email ? <span className="font-mono text-xs">{t.email}</span> : <span className="text-faint">—</span>],
            ['Phone', t.phone ? <span className="font-mono text-xs">{t.phone}</span> : <span className="text-faint">—</span>],
            ['Where', [t.city, t.location, t.countryCode].filter(Boolean).join(' · ') || '—'],
            ['Currency', <span key="c" className="font-mono">{cur}</span>],
            ['Remote work', t.acceptsRemote ? 'Accepted' : 'Not accepted'],
            ['Followers', num(t.followerCount)],
            [
              'Specialties',
              t.specialties.length ? (
                <span className="flex flex-wrap gap-1">
                  {t.specialties.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </span>
              ) : (
                <span className="text-faint">none set</span>
              ),
            ],
          ]}
        />
      </Section>

      <Section title="What they have built">
        <StatRow cols={5}>
          <Stat label="Clients" value={num(stats.clients)} />
          <Stat label="Orders" value={num(stats.orders)} />
          <Stat label="Invoices" value={num(stats.invoices)} />
          <Stat label="Billed" value={money(stats.billed, cur)} hint="all invoices, this tailor's currency" />
          <Stat label="Outstanding" value={money(stats.outstanding, cur)} tone={stats.outstanding > 0 ? 'ink' : 'muted'} />
        </StatRow>
        <div className="mt-8">
          <StatRow cols={5}>
            <Stat label="Portfolio works" value={num(stats.works)} tone="muted" />
            <Stat
              label="Published to feed"
              value={num(stats.published)}
              tone={stats.published === 0 ? 'bad' : 'ink'}
              hint={stats.published === 0 ? 'invisible to clients' : undefined}
            />
            <Stat label="Templates" value={num(stats.templates)} tone="muted" />
            <Stat label="Fabrics" value={num(stats.fabrics)} tone="muted" />
            <Stat label="Design uploads" value={num(stats.designs)} tone="muted" />
          </StatRow>
        </div>
        {stats.published === 0 && stats.orders > 0 ? (
          <Note tone="copper">
            {stats.orders} {stats.orders === 1 ? 'order' : 'orders'} and nothing published. This tailor exists only
            inside their own app — no client browsing the feed can find them.
          </Note>
        ) : null}
      </Section>

      <Section title="Orders per month">
        <Columns data={ordersMonthly} unit="Orders" />
      </Section>

      {statuses.length ? (
        <Section title="Order status">
          <HBars data={statuses.map((s) => ({ ...s, label: label(s.label) }))} colors={ORDER_STATUS_COLOR} />
        </Section>
      ) : null}

      <Section title="Orders" right={`${orders.length} shown`} subtitle={stats.orders > orders.length ? `Most recent ${orders.length} of ${stats.orders}.` : undefined}>
        {orders.length === 0 ? (
          <Empty>No orders yet.</Empty>
        ) : (
          <Table head={['Order', 'Client', 'Status', 'Delivery', 'Created']} align={['left', 'left', 'left', 'right', 'right']}>
            {orders.map((o) => (
              <Row key={o.id}>
                <LinkCell href={`/orders/${o.id}`}>{o.name}</LinkCell>
                <Cell dim>{o.client ?? '—'}</Cell>
                <Cell><Tag>{label(o.status)}</Tag></Cell>
                <Cell right dim mono>{o.delivery ? relative(o.delivery) : '—'}</Cell>
                <Cell right dim mono>{date(o.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Invoices" right={`${invoices.length} shown`}>
        {invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <Table
            head={['Number', 'Status', 'Total', 'Deposit', 'Outstanding', 'Issued']}
            align={['left', 'left', 'right', 'right', 'right', 'right']}
          >
            {invoices.map((i) => (
              <Row key={i.id}>
                <LinkCell href={`/invoices/${i.id}`}>{i.number}</LinkCell>
                <Cell><Tag>{i.status}</Tag></Cell>
                <Cell right mono>{money(i.total, i.currency)}</Cell>
                <Cell right mono dim>{money(i.deposit, i.currency)}</Cell>
                <Cell right mono>{money(i.total - i.deposit, i.currency)}</Cell>
                <Cell right dim mono>{date(i.issuedAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Clients" right={`${clients.length} shown`} subtitle="This tailor's own address book — not client-app accounts.">
        {clients.length === 0 ? (
          <Empty>No clients yet.</Empty>
        ) : (
          <Table head={['Name', 'Phone', 'Email', 'Orders', 'Added']} align={['left', 'left', 'left', 'right', 'right']}>
            {clients.map((c) => (
              <Row key={c.id}>
                <Cell>{c.fullName}</Cell>
                <Cell dim mono>{c.phone === '—' ? <span className="text-warn">placeholder</span> : c.phone ?? '—'}</Cell>
                <Cell dim>{c.email ?? '—'}</Cell>
                <Cell right mono>{c.orders}</Cell>
                <Cell right dim mono>{date(c.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
