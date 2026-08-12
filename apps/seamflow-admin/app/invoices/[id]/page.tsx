import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Meter } from '../../../components/charts';
import { Cell, Empty, Facts, Note, PageHeader, Row, Section, Table, Tag } from '../../../components/primitives';
import { date, dateTime, money, num } from '../../../lib/format';
import { getInvoice } from '../../../lib/queries/invoices';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoice(id);
  if (!data) notFound();

  const { invoice: v, lineItems, payments } = data;
  const cur = v.currency;
  const computed = lineItems.reduce((a, li) => a + li.quantity * li.unitPrice, 0);
  const mismatch = Math.abs(computed - v.total) > 0.005;
  const outstanding = v.total - v.deposit;

  return (
    <>
      <PageHeader
        title={v.number}
        back={{ href: '/invoices', label: 'All invoices' }}
        right={<>{v.status} · created {date(v.createdAt)}</>}
        lede={v.notes ?? undefined}
      />

      <Section title="Invoice">
        <Facts
          items={[
            ['Status', <Tag key="s">{v.status}</Tag>],
            ['Tailor', <Link key="t" href={`/tailors/${v.tailorId}`} className="underline decoration-rule underline-offset-4 hover:decoration-primary">{v.tailor}</Link>],
            [
              'Order',
              v.orderId ? (
                <Link href={`/orders/${v.orderId}`} className="underline decoration-rule underline-offset-4 hover:decoration-primary">
                  {v.orderName}
                </Link>
              ) : (
                <span className="text-faint">not linked</span>
              ),
            ],
            ['Client', v.client ?? <span className="text-faint">—</span>],
            ['Currency', cur ? <span key="c" className="font-mono">{cur}</span> : <span className="text-bad">not set</span>],
            ['Issued', date(v.issuedAt)],
            ['Last updated', dateTime(v.updatedAt)],
            ['Line items', num(lineItems.length)],
          ]}
        />
      </Section>

      <Section title="Line items" subtitle="Quantity may be fractional — 2.5 metres of fabric is a real line, and rounding it would change the bill.">
        {lineItems.length === 0 ? (
          <Empty>No line items on this invoice.</Empty>
        ) : (
          <Table
            head={['Description', 'Category', 'Qty', 'Unit price', 'Amount']}
            align={['left', 'left', 'right', 'right', 'right']}
          >
            {lineItems.map((li) => (
              <Row key={li.id}>
                <Cell wide>{li.description || <span className="text-faint">untitled</span>}</Cell>
                <Cell><Tag>{li.category ?? 'other'}</Tag></Cell>
                <Cell right mono>{li.quantity}</Cell>
                <Cell right mono dim>{money(li.unitPrice, cur)}</Cell>
                <Cell right mono>{money(li.quantity * li.unitPrice, cur)}</Cell>
              </Row>
            ))}
            <tr className="border-b-2 border-ink">
              <Cell>&nbsp;</Cell>
              <Cell>&nbsp;</Cell>
              <Cell>&nbsp;</Cell>
              <Cell right dim>Computed</Cell>
              <Cell right mono>{money(computed, cur)}</Cell>
            </tr>
            <tr>
              <Cell>&nbsp;</Cell>
              <Cell>&nbsp;</Cell>
              <Cell>&nbsp;</Cell>
              <Cell right dim>Stored total</Cell>
              <Cell right mono>
                {mismatch ? <span className="text-bad">{money(v.total, cur)}</span> : money(v.total, cur)}
              </Cell>
            </tr>
          </Table>
        )}

        {mismatch ? (
          <Note tone="copper">
            The stored total disagrees with the line items by{' '}
            <strong className="font-semibold">{money(Math.abs(v.total - computed), cur)}</strong>. Whatever the tailor
            sees in the app, this is the number the database will hand to anything that reads it.
          </Note>
        ) : null}
      </Section>

      <Section title="Balance">
        <Meter
          parts={[
            { label: 'Deposit taken', value: v.deposit, formatted: money(v.deposit, cur), tone: 'filled' },
            { label: 'Outstanding', value: outstanding, formatted: money(outstanding, cur), tone: 'track' },
          ]}
        />
      </Section>

      <Section title="Payments" subtitle="Recorded against this invoice's order.">
        {payments.length === 0 ? (
          <Empty>
            No payments recorded. Nothing in the product can take one yet — payments are specced but unbuilt (ROADMAP
            appendix F).
          </Empty>
        ) : (
          <Table head={['Amount', 'Status', 'Provider', 'When']} align={['right', 'left', 'left', 'right']}>
            {payments.map((p) => (
              <Row key={p.id}>
                <Cell right mono>{money(p.amount, p.currency)}</Cell>
                <Cell><Tag>{p.status}</Tag></Cell>
                <Cell dim>{p.provider ?? '—'}</Cell>
                <Cell right dim mono>{dateTime(p.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
