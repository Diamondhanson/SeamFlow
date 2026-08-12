import { CleanupButton } from '../../components/cleanup-button';
import { Cell, Empty, Flag, LinkCell, Note, PageHeader, Row, Section, Stat, StatRow, Table } from '../../components/primitives';
import { date, money, num } from '../../lib/format';
import { SAFE_MUTATIONS } from '../../lib/guard';
import { getHealth } from '../../lib/queries/health';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const { checks, duplicates, placeholders, emptyDrafts, mismatched } = await getHealth();

  const failing = checks.filter((c) => c.severity === 'warn' && c.count > 0);
  const rowsAffected = failing.reduce((a, c) => a + c.count, 0);

  return (
    <>
      <PageHeader
        title="Data health"
        lede="Records that are quietly wrong. Every check maps to a defect that actually happened in this codebase or a rule the schema does not enforce — generic hygiene is deliberately absent, because a checklist that always shows warnings is one people stop reading."
        right={failing.length === 0 ? 'all clear' : `${failing.length} to review`}
      />

      <Section title="Summary">
        <StatRow cols={3}>
          <Stat label="Checks failing" value={num(failing.length)} tone={failing.length > 0 ? 'bad' : 'ink'} />
          <Stat label="Rows affected" value={num(rowsAffected)} tone="muted" />
          <Stat label="Fixable from here" value={num(failing.filter((c) => c.fix).length)} tone="muted" />
        </StatRow>

        <Note>
          This page can change three things and nothing else &mdash; merge duplicate clients, clear placeholder contact
          values, and delete empty draft invoices. The list is enforced by an allowlist in{' '}
          <code className="font-mono text-xs">lib/guard.ts</code>, not by convention, because a dashboard with no login
          should not be able to grow a delete button by accident. Every run is appended to{' '}
          <code className="font-mono text-xs">.ops-audit.log</code>.
        </Note>
      </Section>

      <Section title="Checks">
        <Table head={['Check', 'Count', 'Status', 'What it means', 'Fix']} align={['left', 'right', 'left', 'left', 'left']}>
          {checks.map((c) => (
            <Row key={c.id}>
              <Cell wide>{c.label}</Cell>
              <Cell right mono>{c.count}</Cell>
              <Cell>
                <Flag
                  severity={c.severity === 'info' ? 'idle' : c.severity}
                  label={c.severity === 'info' ? 'context' : c.count === 0 ? 'clear' : 'review'}
                />
              </Cell>
              <Cell dim wide>{c.detail}</Cell>
              <Cell wide>
                {c.fix ? (
                  <CleanupButton
                    op={c.fix}
                    label={FIX_LABELS[c.fix]}
                    description={SAFE_MUTATIONS[c.fix]}
                    affected={c.count}
                  />
                ) : null}
              </Cell>
            </Row>
          ))}
        </Table>
      </Section>

      <Section
        title="Duplicate clients"
        subtitle="Same phone number, same tailor, more than one row. Merging keeps the oldest record, fills any blank field on it from the others, repoints every order and measurement set, then deletes the rest."
        right={`${duplicates.length} group${duplicates.length === 1 ? '' : 's'}`}
      >
        {duplicates.length === 0 ? (
          <Empty>No duplicates.</Empty>
        ) : (
          <Table head={['Tailor', 'Phone', 'Copies', 'Names on file', 'Oldest']} align={['left', 'left', 'right', 'left', 'right']}>
            {duplicates.map((d, i) => (
              <Row key={`${d.phone}-${i}`}>
                <Cell>{d.tailor}</Cell>
                <Cell mono>{d.phone}</Cell>
                <Cell right mono>{d.copies}</Cell>
                <Cell dim wide>{d.names}</Cell>
                <Cell right dim mono>{date(d.oldest)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Placeholder contact details"
        subtitle="The literal character '—' stored where a phone number or address should be. It renders exactly like a real value, and it makes duplicate detection think everyone shares a phone number."
        right={`${placeholders.length} record${placeholders.length === 1 ? '' : 's'}`}
      >
        {placeholders.length === 0 ? (
          <Empty>No placeholder values.</Empty>
        ) : (
          <Table head={['Client', 'Tailor', 'Phone', 'Address']} align={['left', 'left', 'left', 'left']}>
            {placeholders.map((p) => (
              <Row key={p.id}>
                <Cell>{p.fullName}</Cell>
                <Cell dim>{p.tailor}</Cell>
                <Cell mono>{p.phone === '—' ? <span className="text-warn">—</span> : p.phone ?? 'null'}</Cell>
                <Cell mono wide>{p.address === '—' ? <span className="text-warn">—</span> : p.address ?? 'null'}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Invoice totals that disagree with their line items"
        subtitle="Stored total against Σ quantity × unit price. These should always match; a gap is what a rounding bug looks like from the outside. Not fixable from here — the correct value depends on which of the two the tailor believes."
        right={`${mismatched.length}`}
      >
        {mismatched.length === 0 ? (
          <Empty>Every invoice total matches its line items.</Empty>
        ) : (
          <Table head={['Invoice', 'Tailor', 'Stored', 'Computed', 'Difference']} align={['left', 'left', 'right', 'right', 'right']}>
            {mismatched.map((m) => (
              <Row key={m.id}>
                <LinkCell href={`/invoices/${m.id}`}>{m.number}</LinkCell>
                <Cell dim>{m.tailor}</Cell>
                <Cell right mono>{money(m.total, m.currency)}</Cell>
                <Cell right mono>{money(m.computed, m.currency)}</Cell>
                <Cell right mono>
                  <span className="text-bad">{money(Math.abs(m.total - m.computed), m.currency)}</span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Empty draft invoices"
        subtitle="Draft, zero total, no payment recorded against the order. Safe to delete — a sent invoice is never touched, because someone may already have shown it to a client."
        right={`${emptyDrafts.length}`}
      >
        {emptyDrafts.length === 0 ? (
          <Empty>No empty drafts.</Empty>
        ) : (
          <Table head={['Invoice', 'Tailor', 'Currency', 'Created']} align={['left', 'left', 'left', 'right']}>
            {emptyDrafts.map((e) => (
              <Row key={e.id}>
                <LinkCell href={`/invoices/${e.id}`}>{e.number}</LinkCell>
                <Cell dim>{e.tailor}</Cell>
                <Cell mono dim>{e.currency ?? <span className="text-bad">not set</span>}</Cell>
                <Cell right dim mono>{date(e.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}

const FIX_LABELS: Record<string, string> = {
  'clients.merge-duplicates': 'Merge duplicates',
  'clients.clear-placeholders': 'Clear placeholders',
  'invoices.delete-empty-drafts': 'Delete empty drafts',
};
