import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cell, Empty, Facts, Note, PageHeader, Row, Section, Table, Tag } from '../../../components/primitives';
import { date, dateTime, label, money, num, relative } from '../../../lib/format';
import { getOrder } from '../../../lib/queries/orders';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();

  const { order: o, items, photos, events, invoice } = data;
  const late = o.dateDelivery && new Date(o.dateDelivery) < new Date() && o.status !== 'delivered';

  return (
    <>
      <PageHeader
        title={o.name}
        back={{ href: '/orders', label: 'All orders' }}
        right={<>created {date(o.createdAt)}</>}
        lede={o.notes ?? undefined}
      />

      <Section title="Order">
        <Facts
          items={[
            ['Status', <Tag key="s">{label(o.status)}</Tag>],
            ['Tailor', <Link key="t" href={`/tailors/${o.tailorId}`} className="underline decoration-rule underline-offset-4 hover:decoration-primary">{o.tailor}</Link>],
            ['Client', o.client ?? <span className="text-faint">none linked</span>],
            ['Client phone', o.clientPhone === '—' ? <span className="text-warn">placeholder</span> : o.clientPhone ?? '—'],
            ['Ordered', date(o.dateOrdered)],
            [
              'Delivery',
              o.dateDelivery ? (
                <span className={late ? 'text-warn' : undefined}>
                  {date(o.dateDelivery)} · {relative(o.dateDelivery)}
                </span>
              ) : (
                <span className="text-faint">not set</span>
              ),
            ],
            ['Fabric', o.fabric ? `${o.fabric}${o.yardage ? ` · ${o.yardage}m` : ''}` : <span className="text-faint">—</span>],
            [
              'Claimed by',
              o.claimedBy ?? <span className="text-faint">nobody</span>,
            ],
          ]}
        />
        {!o.claimedBy ? (
          <Note>
            Nobody has claimed this order in the client app, so no client can track it or be notified when its status
            changes. That is expected for a walk-in — only orders created from a quoted conversation claim themselves.
          </Note>
        ) : null}
      </Section>

      <Section title="Items" right={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}>
        {items.length === 0 ? (
          <Empty>No items on this order.</Empty>
        ) : (
          <div className="space-y-8">
            {items.map((it) => {
              const measurements = Object.entries(it.measurements).filter(([, v]) => v !== null && v !== '');
              return (
                <div key={it.id} className="border-t border-rule pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h3 className="font-display text-lg font-semibold">{it.garmentType || 'Untitled item'}</h3>
                    <span className="font-mono tnum text-sm text-muted">
                      ×{it.quantity}
                      {it.unitPrice !== null ? ` · ${money(it.unitPrice, o.currency)}` : ''}
                    </span>
                  </div>
                  {it.notes ? <p className="mt-1 text-sm text-muted">{it.notes}</p> : null}

                  {measurements.length === 0 ? (
                    <p className="mt-3 text-sm italic text-faint">No measurements recorded.</p>
                  ) : (
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                      {measurements.map(([k, v]) => (
                        <div key={k} className="border-l border-rule pl-3">
                          <dt className="text-2xs uppercase tracking-widest text-faint">{label(k)}</dt>
                          <dd className="font-mono tnum text-sm">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Photos"
        right={`${photos.length}`}
        subtitle="Publishing to the public feed starts here — an order with no photo can never produce public work."
      >
        {photos.length === 0 ? (
          <Empty>No photos. This order cannot be published from.</Empty>
        ) : (
          <Table head={['Role', 'Caption', 'On the feed', 'Added']} align={['left', 'left', 'left', 'right']}>
            {photos.map((p) => (
              <Row key={p.id}>
                <Cell><Tag>{p.role ?? 'photo'}</Tag></Cell>
                <Cell dim wide>{p.caption ?? '—'}</Cell>
                <Cell>{p.published ? 'Published' : <span className="text-faint">Not published</span>}</Cell>
                <Cell right dim mono>{date(p.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Invoice">
        {!invoice ? (
          <Empty>No invoice raised for this order.</Empty>
        ) : (
          <Table head={['Number', 'Status', 'Total', 'Deposit', 'Outstanding']} align={['left', 'left', 'right', 'right', 'right']}>
            <Row>
              <td className="px-3 py-2.5">
                <Link href={`/invoices/${invoice.id}`} className="font-medium underline decoration-rule underline-offset-4 hover:decoration-primary">
                  {invoice.number}
                </Link>
              </td>
              <Cell><Tag>{invoice.status}</Tag></Cell>
              <Cell right mono>{money(invoice.total, invoice.currency)}</Cell>
              <Cell right mono dim>{money(invoice.deposit, invoice.currency)}</Cell>
              <Cell right mono>{money(invoice.total - invoice.deposit, invoice.currency)}</Cell>
            </Row>
          </Table>
        )}
      </Section>

      <Section title="History" right={`${num(events.length)} events`} subtitle="Every status change, newest first.">
        {events.length === 0 ? (
          <Empty>No recorded events.</Empty>
        ) : (
          <Table head={['Event', 'Change', 'By', 'When']} align={['left', 'left', 'left', 'right']}>
            {events.map((e) => (
              <Row key={e.id}>
                <Cell><Tag>{label(e.eventType)}</Tag></Cell>
                <Cell dim>
                  {e.fromStatus || e.toStatus ? `${label(e.fromStatus) || '—'} → ${label(e.toStatus) || '—'}` : '—'}
                </Cell>
                <Cell dim>{e.actor ?? '—'}</Cell>
                <Cell right dim mono>{dateTime(e.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
