import Link from 'next/link';
import { Cell, Empty, PageHeader, Row, Stat, StatRow, Table, Tag } from '../../../components/primitives';
import { FilterBar, Search } from '../../../components/filters';
import { date, num, relative } from '../../../lib/format';
import { getSubscriptions, getSubscriptionRevenue, SUBS_TABS, type SubsTab } from '../../../lib/queries/subscriptions';
import { getEnforcement } from '../../../lib/subscription-actions';
import { EnforcementSwitch, ExtendAllTrials, RowActions } from './actions';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: SubsTab = SUBS_TABS.some((t) => t.key === sp.tab) ? (sp.tab as SubsTab) : 'trialing';
  const q = sp.q ?? '';
  const [{ counts, rows }, revenue, enforced] = await Promise.all([
    getSubscriptions(tab, q),
    getSubscriptionRevenue(),
    getEnforcement().catch(() => false),
  ]);

  // Who needs attention: a trial about to end is a conversation to have now,
  // not a number to read later.
  const endingSoon = rows.filter((r) => r.state === 'trialing' && r.daysLeft <= 7).length;

  const href = (key: SubsTab) => {
    const p = new URLSearchParams();
    if (key !== 'trialing') p.set('tab', key);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `/subscriptions?${s}` : '/subscriptions';
  };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        lede="Every tailor's trial, paid time and usage. Payments are not wired yet — until they are, these levers are how anyone gets more time."
        right={`${num(counts.all)} tailors`}
      />

      <StatRow cols={4}>
        <Stat label="On trial" value={num(counts.trialing)} />
        <Stat label="Ending within 7 days" value={num(endingSoon)} tone={endingSoon > 0 ? 'bad' : 'muted'} />
        <Stat label="Paying" value={num(counts.active)} tone={counts.active > 0 ? 'primary' : 'muted'} />
        <Stat label="On Free" value={num(counts.free)} />
      </StatRow>

      {revenue.length > 0 ? (
        <p className="mt-6 text-sm text-muted">
          Taken so far:{' '}
          {revenue.map((r) => `${Number(r.total).toLocaleString('en-GB')} ${r.currency} (${r.payments})`).join(' · ')}
        </p>
      ) : null}

      <div className="mt-8 border-y border-rule bg-surface px-4 py-4">
        <EnforcementSwitch enforced={enforced} />
      </div>
      <div className="mt-4 border-b border-rule bg-surface px-4 py-3">
        <ExtendAllTrials />
      </div>

      <nav className="mt-8 flex flex-wrap border-b border-rule" aria-label="Subscription state">
        {SUBS_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                active ? 'border-primary font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
              <span className="ml-2 font-mono tnum text-xs text-faint">{counts[t.key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5">
        <FilterBar>
          <Search placeholder="Shop name or email" />
        </FilterBar>
      </div>

      {rows.length === 0 ? (
        <Empty>{q ? 'No tailors match that search.' : 'Nobody in this state.'}</Empty>
      ) : (
        <Table
          head={['Shop', 'State', 'Time left', 'Ends', 'Clients', 'Active orders', '']}
          align={['left', 'left', 'right', 'right', 'right', 'right', 'left']}
        >
          {rows.map((r) => {
            const ends = r.state === 'active' ? r.premiumUntil : r.trialEndsAt;
            const urgent = r.state === 'trialing' && r.daysLeft <= 7;
            return (
              <Row key={r.tailorId}>
                <td className="whitespace-nowrap px-3 py-2.5 align-top">
                  <Link
                    href={`/tailors/${r.tailorId}`}
                    className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-primary"
                  >
                    {r.businessName}
                  </Link>
                  <span className="mt-0.5 block text-xs text-faint">
                    {r.country ?? '—'}
                    {r.email ? ` · ${r.email}` : ''}
                  </span>
                </td>
                <Cell>
                  <Tag>{r.state}</Tag>
                </Cell>
                <Cell right mono>
                  <span className={urgent ? 'text-bad' : undefined}>{r.daysLeft}d</span>
                </Cell>
                <Cell right dim mono>
                  {ends ? date(ends) : '—'}
                </Cell>
                <Cell right mono>{r.clients}</Cell>
                <Cell right mono>{r.activeOrders}</Cell>
                <Cell>
                  <RowActions tailorId={r.tailorId} state={r.state} />
                  {r.lastPaymentAt ? (
                    <span className="mt-1 block text-2xs uppercase tracking-widest text-faint">
                      paid {relative(r.lastPaymentAt)}
                    </span>
                  ) : null}
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </>
  );
}
