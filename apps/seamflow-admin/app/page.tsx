// ============================================================================
// SeamFlow Ops — the whole platform on one page.
//
// A server component that queries Postgres directly and renders. No client
// JavaScript, no loading states, no auth: it is a localhost page for one
// person, and every one of those would be ceremony.
//
// The order of the page is an argument, not a menu:
//
//   1. what exists         headline counts
//   2. are the two sides meeting?   the funnel — the actual question
//   3. money               grouped by currency, never summed across
//   4. who                 per-tailor drill-down
//   5. what just happened  merged timeline across both apps
//   6. what is wrong       integrity checks
//
// Vanity metrics near the top would bury the funnel, and the funnel is the only
// thing here that can tell you the marketplace is not working yet.
// ============================================================================

import { getDashboard } from '../lib/metrics';
import { Bar, Cell, Empty, Flag, Row, Section, Stat, StatRow, Table } from '../components/primitives';

// Always hit the database — a cached ops dashboard is a lying ops dashboard.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fmtDate = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Money, in its own currency. Never converted, never summed with another. */
const fmtMoney = (amount: number, currency: string | null) => {
  if (!currency) return amount.toLocaleString('en-GB');
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-GB')}`;
  }
};

export default async function OpsPage() {
  // One query, not seven. The database is ~7.7s of connection latency away;
  // fanning out made this page take 40–60 seconds. See lib/metrics.ts.
  const { counts, funnel, money, statuses, tailors, activity, health } =
    await getDashboard();

  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const statusMax = Math.max(...statuses.map((s) => s.count), 1);
  const issues = health.filter((h) => h.severity !== 'ok').length;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <header className="border-b-2 border-ink pb-5 mb-10">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="font-display text-4xl font-bold tracking-tight">SeamFlow Ops</h1>
          <div className="text-2xs uppercase tracking-widest text-faint">
            Local only · no authentication ·{' '}
            <span className="text-copper">{fmtDateTime(new Date())}</span>
          </div>
        </div>
        <p className="text-sm text-muted mt-3 max-w-3xl">
          Every tailor and every client, across both apps. Read-only, straight from
          the production database.
        </p>
      </header>

      {/* ── 1. What exists ───────────────────────────────────────────── */}
      <Section
        title="Platform"
        subtitle="Raw counts. Useful as a baseline, but the funnel below is the number that matters."
      >
        <StatRow>
          <Stat label="Tailors" value={counts.tailors} />
          <Stat label="Client accounts" value={counts.clientAccounts} hint="signed up in the client app" />
          <Stat label="CRM clients" value={counts.crmClients} hint="typed in by tailors" tone="muted" />
          <Stat label="Orders" value={counts.orders} />
          <Stat label="Invoices" value={counts.invoices} />
          <Stat label="Notifications" value={counts.notifications} tone="muted" />
        </StatRow>

        <p className="text-sm text-muted mt-8 max-w-3xl leading-relaxed">
          <strong className="font-semibold text-ink">CRM clients and client accounts are different populations.</strong>{' '}
          A tailor types a client into their address book; a client signs up in the
          consumer app. There is no link between the two — {counts.crmClients} CRM
          rows against {counts.clientAccounts} accounts — so the same person can
          exist twice with nothing joining them.
        </p>
      </Section>

      {/* ── 2. Are the two sides meeting? ────────────────────────────── */}
      <Section
        title="Marketplace funnel"
        subtitle="Each step is a subset of the one above. Where it hits zero is where the product stops."
        right={`${funnel[0]?.value ?? 0} → ${funnel[funnel.length - 1]?.value ?? 0}`}
      >
        <div className="space-y-5">
          {funnel.map((step, i) => (
            <div key={step.label} className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-12 sm:col-span-5">
                <div className="text-sm text-ink">{step.label}</div>
                <div className="text-xs text-faint mt-0.5">{step.note}</div>
              </div>
              <div className="col-span-9 sm:col-span-5">
                <Bar value={step.value} max={funnelMax} tone={step.value === 0 ? 'copper' : 'primary'} />
              </div>
              <div className="col-span-3 sm:col-span-2 text-right font-mono tnum text-lg">
                {step.value}
              </div>
              {i < funnel.length - 1 ? null : null}
            </div>
          ))}
        </div>

        {funnel.some((f) => f.value === 0) ? (
          <p className="text-sm text-copper mt-7 border-l-2 border-copper pl-4 max-w-3xl leading-relaxed">
            The chain breaks at{' '}
            <strong className="font-semibold">
              {funnel.find((f) => f.value === 0)?.label.toLowerCase()}
            </strong>
            . Everything below it is zero as a consequence, not independently — there
            is supply on the platform and nothing for the demand side to find yet.
          </p>
        ) : null}
      </Section>

      {/* ── 3. Money ─────────────────────────────────────────────────── */}
      <Section
        title="Invoiced"
        subtitle="Grouped by currency. There is deliberately no grand total — adding XAF to EUR would produce a confident, meaningless number."
      >
        {money.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <Table
            head={['Currency', 'Invoices', 'Billed', 'Deposits', 'Outstanding']}
            align={['left', 'right', 'right', 'right', 'right']}
          >
            {money.map((m) => (
              <Row key={m.currency ?? 'none'}>
                <Cell>
                  {m.currency ?? <span className="text-bad">not set</span>}
                </Cell>
                <Cell right mono>{m.invoices}</Cell>
                <Cell right mono>{fmtMoney(m.billed, m.currency)}</Cell>
                <Cell right mono dim>{fmtMoney(m.deposits, m.currency)}</Cell>
                <Cell right mono>{fmtMoney(m.outstanding, m.currency)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {/* ── Orders by status ─────────────────────────────────────────── */}
      <Section title="Orders by status" subtitle="Where the work in progress actually sits.">
        {statuses.length === 0 ? (
          <Empty>No orders yet.</Empty>
        ) : (
          <div className="space-y-4">
            {statuses.map((s) => (
              <div key={s.status} className="grid grid-cols-12 items-center gap-4">
                <div className="col-span-4 sm:col-span-3 text-sm capitalize">
                  {s.status.replace(/_/g, ' ')}
                </div>
                <div className="col-span-6 sm:col-span-7">
                  <Bar value={s.count} max={statusMax} />
                </div>
                <div className="col-span-2 text-right font-mono tnum">{s.count}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── 4. Who ───────────────────────────────────────────────────── */}
      <Section title="Tailors" subtitle="Every account, newest first." right={`${tailors.length} total`}>
        {tailors.length === 0 ? (
          <Empty>No tailors yet.</Empty>
        ) : (
          <Table
            head={['Business', 'Where', 'Cur.', 'Clients', 'Orders', 'Invoices', 'Published', 'Last order']}
            align={['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right']}
          >
            {tailors.map((t) => (
              <Row key={t.id}>
                <Cell>
                  <span className="font-medium">{t.businessName}</span>
                  <span className="block text-xs text-faint mt-0.5">
                    joined {fmtDate(t.createdAt)}
                  </span>
                </Cell>
                <Cell dim>{t.city ?? t.countryCode}</Cell>
                <Cell dim mono>{t.currency}</Cell>
                <Cell right mono>{t.clients}</Cell>
                <Cell right mono>{t.orders}</Cell>
                <Cell right mono>{t.invoices}</Cell>
                <Cell right mono>
                  {t.published === 0 ? <span className="text-faint">0</span> : t.published}
                </Cell>
                <Cell right dim mono>{fmtDate(t.lastOrderAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {/* ── 5. What just happened ────────────────────────────────────── */}
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
                  <span className="text-2xs uppercase tracking-widest text-faint">{a.kind}</span>
                </Cell>
                <Cell>{a.label}</Cell>
                <Cell dim>{a.detail}</Cell>
                <Cell right dim mono>{fmtDateTime(a.at)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      {/* ── 6. What is wrong ─────────────────────────────────────────── */}
      <Section
        title="Data health"
        subtitle="Records that are quietly wrong. Every check here maps to a defect found in this codebase, not generic hygiene."
        right={issues === 0 ? 'all clear' : `${issues} to review`}
      >
        <Table head={['Check', 'Count', 'Status', 'What it means']} align={['left', 'right', 'left', 'left']}>
          {health.map((h) => (
            <Row key={h.label}>
              <Cell>{h.label}</Cell>
              <Cell right mono>{h.count}</Cell>
              <Cell><Flag severity={h.severity} /></Cell>
              <Cell dim>{h.detail}</Cell>
            </Row>
          ))}
        </Table>
      </Section>

      <footer className="border-t border-rule mt-14 pt-5 text-xs text-faint">
        Read-only. This page cannot change anything — and it refuses to start in
        production, because it has no authentication and shows every tailor&rsquo;s
        client list.
      </footer>
    </main>
  );
}
