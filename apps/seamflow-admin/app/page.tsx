// ============================================================================
// Overview.
//
// The order of this page is an argument, not a menu:
//
//   1. what exists                    headline counts
//   2. are the two sides meeting?     the funnel — the actual question
//   3. growth                         is either side arriving at all
//   4. money                          per currency, never summed across
//   5. work in progress               where orders actually sit
//   6. what just happened             merged timeline across both apps
//
// Vanity metrics near the top would bury the funnel, and the funnel is the one
// thing here that can tell you the marketplace is not working yet.
// ============================================================================

import Link from 'next/link';
import { Columns, HBars, Lines, Meter } from '../components/charts';
import { Cell, Empty, LinkCell, Note, PageHeader, Row, Section, Stat, StatRow, Table, Tag } from '../components/primitives';
import { dateTime, label, money, num } from '../lib/format';
import { CATEGORICAL, ORDER_STATUS_COLOR } from '../lib/palette';
import { getOverview } from '../lib/queries/overview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OverviewPage() {
  const { counts, funnel, money: currencies, statuses, signups, orders, activity } = await getOverview();

  const broken = funnel.find((f) => f.value === 0);
  const funnelNotes = Object.fromEntries(funnel.map((f) => [f.key, f.note]));
  const statusNotes = Object.fromEntries(statuses.map((s) => [s.key, '']));

  return (
    <>
      <PageHeader
        title="Overview"
        lede="Every tailor and every client, across both apps. Read-only, straight from the production database."
        right={<>Local only · no authentication · {dateTime(new Date())}</>}
      />

      <Section title="Platform" subtitle="Raw counts. A baseline — the funnel below is the number that matters.">
        <StatRow>
          <Stat label="Tailors" value={num(counts.tailors)} href="/tailors" />
          <Stat label="Client accounts" value={num(counts.clientAccounts)} hint="signed up in the client app" href="/clients" />
          <Stat label="CRM clients" value={num(counts.crmClients)} hint="typed in by tailors" tone="muted" href="/clients" />
          <Stat label="Orders" value={num(counts.orders)} href="/orders" />
          <Stat label="Invoices" value={num(counts.invoices)} href="/invoices" />
          <Stat label="Enquiries" value={num(counts.enquiries)} tone={counts.enquiries === 0 ? 'muted' : 'ink'} href="/enquiries" />
        </StatRow>

        <Note>
          <strong className="font-semibold text-ink">CRM clients and client accounts are different populations.</strong>{' '}
          A tailor types a client into their address book; a client signs up in the consumer app. Nothing joins the
          two — {num(counts.crmClients)} CRM rows against {num(counts.clientAccounts)} accounts — so the same person can
          exist twice with no relationship between the records.
        </Note>
      </Section>

      <Section
        title="Marketplace funnel"
        subtitle="Each step is a subset of the one above. Where it hits zero is where the product stops."
        right={`${funnel[0]?.value ?? 0} → ${funnel[funnel.length - 1]?.value ?? 0}`}
      >
        {/* Ordinal, not categorical: these stages have an order, and the colour
            ramp is what makes that order visible without reading the labels. */}
        <HBars data={funnel} ordinal notes={funnelNotes} />

        {broken ? (
          <Note tone="copper">
            The chain breaks at <strong className="font-semibold">{broken.label.toLowerCase()}</strong>. Everything
            below it is zero as a consequence, not independently — there is supply on the platform and nothing for the
            demand side to find yet. <Link href="/feed" className="underline underline-offset-4">See why in Feed &amp; works →</Link>
          </Note>
        ) : null}
      </Section>

      <Section title="Arrivals" subtitle="Accounts created per month, both sides of the marketplace on one scale.">
        <Lines
          series={[
            { name: 'Tailors', color: CATEGORICAL[0], points: signups.tailors },
            { name: 'Client accounts', color: CATEGORICAL[1], points: signups.clients },
          ]}
        />
      </Section>

      <Section title="Orders created" subtitle="Per month, across every tailor.">
        <Columns data={orders} unit="Orders" />
      </Section>

      <Section
        title="Invoiced"
        subtitle="Grouped by currency. Deliberately no grand total — adding XAF to NGN would produce a confident, meaningless number."
        right={`${currencies.length} ${currencies.length === 1 ? 'currency' : 'currencies'}`}
      >
        {currencies.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {currencies.map((m) => (
              <div key={m.currency ?? 'none'} className="border-t border-rule pt-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-display text-lg font-semibold">
                    {m.currency ?? <span className="text-bad">No currency set</span>}
                  </span>
                  <span className="text-2xs uppercase tracking-widest text-faint">
                    {m.invoices} {m.invoices === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>
                <div className="mb-4 text-3xl font-semibold leading-none tracking-tight">
                  {money(m.billed, m.currency)}
                </div>
                <Meter
                  parts={[
                    { label: 'Deposits taken', value: m.deposits, formatted: money(m.deposits, m.currency), tone: 'filled' },
                    { label: 'Outstanding', value: m.outstanding, formatted: money(m.outstanding, m.currency), tone: 'track' },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Work in progress" subtitle="Where orders actually sit right now." right={<Link href="/orders" className="hover:text-ink">All orders →</Link>}>
        <HBars data={statuses.map((s) => ({ ...s, label: label(s.label) }))} colors={ORDER_STATUS_COLOR} notes={statusNotes} />
      </Section>

      <Section
        title="Recent activity"
        subtitle="Tailor signups, orders, invoices and client signups, merged into one timeline."
      >
        {activity.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <Table head={['', 'What', 'Detail', 'When']} align={['left', 'left', 'left', 'right']}>
            {activity.map((a, i) => (
              <Row key={`${a.kind}-${i}`}>
                <Cell>
                  <Tag>{a.kind}</Tag>
                </Cell>
                {a.href ? (
                  <LinkCell href={a.href}>{a.label}</LinkCell>
                ) : (
                  <Cell>{a.label}</Cell>
                )}
                <Cell dim wide>{label(a.detail)}</Cell>
                <Cell right dim mono>{dateTime(a.at)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
