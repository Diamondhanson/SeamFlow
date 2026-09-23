'use client';

// ============================================================================
// The sidebar.
//
// Grouped by WHICH SIDE OF THE MARKETPLACE a section belongs to, not
// alphabetically and not by table name. SeamFlow only works if supply and
// demand meet, so the navigation says out loud which is which — and the fact
// that the demand column is nearly empty should be visible from the furniture,
// before you have opened a single page.
// ============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '../lib/session-actions';

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    items: [
      { href: '/', label: 'Overview' },
      { href: '/support', label: 'Support' },
      { href: '/subscriptions', label: 'Subscriptions' },
    ],
  },
  {
    title: 'Supply · the tailor app',
    items: [
      { href: '/tailors', label: 'Tailors' },
      { href: '/orders', label: 'Orders' },
      { href: '/invoices', label: 'Invoices' },
      { href: '/feed', label: 'Feed & works' },
    ],
  },
  {
    title: 'Demand · the client app',
    items: [
      { href: '/clients', label: 'Clients' },
      { href: '/enquiries', label: 'Enquiries' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/notifications', label: 'Notifications' },
      { href: '/health', label: 'Data health' },
    ],
  },
];

export function Nav({ issues, support, email }: { issues: number; support: number; email: string }) {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <nav className="flex h-full flex-col">
      <div className="border-b border-rule px-5 py-5">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink">
          SeamFlow Ops
        </Link>
        <div className="mt-1 text-2xs uppercase tracking-widest text-faint">Staff only</div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-5">
            <div className="px-5 pb-2 text-2xs uppercase tracking-widest text-faint">{g.title}</div>
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active(it.href) ? 'page' : undefined}
                className={`flex items-center justify-between border-l-2 px-5 py-1.5 text-sm transition-colors ${
                  active(it.href)
                    ? 'border-primary bg-surface font-medium text-ink'
                    : 'border-transparent text-muted hover:border-rule hover:text-ink'
                }`}
              >
                {it.label}
                {it.href === '/health' && issues > 0 ? (
                  <span className="font-mono tnum text-2xs text-bad">{issues}</span>
                ) : null}
                {it.href === '/support' && support > 0 ? (
                  <span className="font-mono tnum text-2xs text-bad" title="Tickets waiting on us">
                    {support}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-rule px-5 py-4 text-2xs leading-relaxed text-faint">
        <div className="truncate" title={email}>{email}</div>
        <form action={signOut} className="mt-2">
          <button type="submit" className="uppercase tracking-widest text-copper hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
