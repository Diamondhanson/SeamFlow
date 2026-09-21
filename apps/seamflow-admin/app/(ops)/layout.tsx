import { Nav } from '../../components/nav';
import { requireStaff } from '../../lib/auth';
import { getIssueCount } from '../../lib/queries/health';
import { getSupportBadge } from '../../lib/queries/support';

// Every page in the dashboard sits under this layout, so this is where the
// staff check runs for page loads. (Server actions check again themselves.)
export const dynamic = 'force-dynamic';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  // Cheap scalars so the sidebar can carry badges. If the database is
  // unreachable the shell still renders — a dashboard that shows a stack trace
  // instead of navigation is harder to recover from than one showing a zero.
  const [issues, support] = await Promise.all([
    getIssueCount().catch(() => 0),
    getSupportBadge().catch(() => 0),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-rule bg-paper lg:block">
        <Nav issues={issues} support={support} email={staff.email} />
      </aside>
      <div className="min-w-0 flex-1">
        {/* Narrow screens get the same nav, stacked above the content, rather
            than a hamburger — replying from a phone should still work. */}
        <div className="border-b border-rule lg:hidden">
          <Nav issues={issues} support={support} email={staff.email} />
        </div>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
