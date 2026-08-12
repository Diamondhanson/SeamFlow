import { Columns, HBars } from '../../components/charts';
import { Cell, Empty, Flag, Note, PageHeader, Row, Section, Stat, StatRow, Table, Tag } from '../../components/primitives';
import { date, dateTime, label, num } from '../../lib/format';
import { getNotifications } from '../../lib/queries/notifications';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { counts, byType, monthly, recent, delivery, prefs } = await getNotifications();

  const reachable = delivery.filter((d) => d.devices > 0).length;
  const unreachable = delivery.filter((d) => d.devices === 0).length;
  const readRate = counts.total === 0 ? 0 : Math.round(((counts.total - counts.unread) / counts.total) * 100);

  return (
    <>
      <PageHeader
        title="Notifications"
        lede="What the system sent, and whether it could have been delivered at all. Those are different questions."
        right={`${num(counts.total)} sent`}
      />

      <Section title="Sent">
        <StatRow cols={5}>
          <Stat label="Notifications" value={num(counts.total)} />
          <Stat label="Unread" value={num(counts.unread)} tone={counts.unread > 0 ? 'ink' : 'muted'} />
          <Stat label="Read rate" value={`${readRate}%`} tone="muted" />
          <Stat label="Recipients" value={num(counts.recipients)} tone="muted" />
          <Stat label="Accounts muting a type" value={num(counts.muted)} tone="muted" />
        </StatRow>
      </Section>

      <Section
        title="Could it actually be delivered?"
        subtitle="An in-app notification is a database write and cannot fail. A push needs a registered device token, which needs a native build with working credentials."
      >
        <StatRow cols={3}>
          <Stat label="Registered devices" value={num(counts.devices)} />
          <Stat label="Accounts that can receive push" value={num(reachable)} tone={reachable === 0 ? 'bad' : 'ink'} />
          <Stat label="Accounts that cannot" value={num(unreachable)} tone={unreachable > 0 ? 'bad' : 'muted'} />
        </StatRow>

        <Note>
          An account with zero devices still sees everything in the app&rsquo;s notification inbox and receives nothing
          on their phone. The tailor app&rsquo;s Android push works end to end; the client app has a placeholder
          Firebase project and no <code className="font-mono text-xs">google-services.json</code>, and iOS on both apps
          is blocked on the Apple Developer Program.
        </Note>
      </Section>

      {byType.length > 0 ? (
        <Section title="By type" subtitle="Nominal categories — the bar length carries the value, so they all share one hue.">
          {/* Raw type strings, not prettified. They are identifiers you grep
              for in the API and in both apps' locale files, and
              "Quote.declined" exists nowhere in the code. */}
          <HBars data={byType} />
        </Section>
      ) : null}

      <Section title="Sent per month">
        <Columns data={monthly} unit="Notifications" />
      </Section>

      <Section title="Delivery by account" subtitle="Every account, most devices first.">
        {delivery.length === 0 ? (
          <Empty>No accounts.</Empty>
        ) : (
          <Table
            head={['Account', 'Role', 'Devices', 'Platforms', 'Received', 'Unread', 'Device last seen', 'Push']}
            align={['left', 'left', 'right', 'left', 'right', 'right', 'right', 'left']}
          >
            {delivery.map((d) => (
              <Row key={d.id}>
                <Cell>{d.name}</Cell>
                <Cell><Tag>{label(d.role)}</Tag></Cell>
                <Cell right mono>{d.devices === 0 ? <span className="text-faint">0</span> : d.devices}</Cell>
                <Cell dim>{d.platforms ?? '—'}</Cell>
                <Cell right mono>{d.notifications}</Cell>
                <Cell right mono>{d.unread}</Cell>
                <Cell right dim mono>{date(d.lastSeen)}</Cell>
                <Cell>
                  {d.devices > 0 ? <Flag severity="ok" label="reachable" /> : <Flag severity="warn" label="no device" />}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Recent" right={`${recent.length} shown`}>
        {recent.length === 0 ? (
          <Empty>Nothing sent yet.</Empty>
        ) : (
          <Table head={['Type', 'To', 'Role', 'About', 'Read', 'When']} align={['left', 'left', 'left', 'left', 'left', 'right']}>
            {recent.map((r) => (
              <Row key={r.id}>
                <Cell><Tag>{r.type}</Tag></Cell>
                <Cell>{r.recipient}</Cell>
                <Cell dim>{label(r.role)}</Cell>
                <Cell dim>{r.entityType ?? '—'}</Cell>
                <Cell>{r.read ? <Flag severity="ok" label="read" /> : <Flag severity="idle" label="unread" />}</Cell>
                <Cell right dim mono>{dateTime(r.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Tailor reminder preferences" subtitle="Per-tailor settings for the scheduled due-date reminders.">
        {prefs.length === 0 ? (
          <Empty>No tailors have saved preferences — the defaults apply.</Empty>
        ) : (
          <Table
            head={['Tailor', 'Due reminders', 'Lead days', 'Overdue', 'Status changes', 'Hour', 'Timezone', 'Lang']}
            align={['left', 'left', 'left', 'left', 'left', 'right', 'left', 'left']}
          >
            {prefs.map((p) => (
              <Row key={p.tailorId}>
                <Cell>{p.tailor}</Cell>
                <Cell>{p.dueReminders ? <Flag severity="ok" label="on" /> : <Flag severity="idle" label="off" />}</Cell>
                <Cell dim mono>{p.leadDays.join(', ') || '—'}</Cell>
                <Cell>{p.overdue ? <Flag severity="ok" label="on" /> : <Flag severity="idle" label="off" />}</Cell>
                <Cell>{p.statusChange ? <Flag severity="ok" label="on" /> : <Flag severity="idle" label="off" />}</Cell>
                <Cell right mono>{String(p.hour).padStart(2, '0')}:00</Cell>
                <Cell dim>{p.timezone}</Cell>
                <Cell dim mono>{p.language}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
