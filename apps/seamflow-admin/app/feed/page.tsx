import { HBars } from '../../components/charts';
import { Cell, Empty, Flag, LinkCell, Note, PageHeader, Row, Section, Stat, StatRow, Table, Tag } from '../../components/primitives';
import { date, label, money, num } from '../../lib/format';
import { getFeed } from '../../lib/queries/feed';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const { chain, works, posts, byTailor, designs } = await getFeed();
  const notes = Object.fromEntries(chain.map((c) => [c.key, c.note]));

  const orders = chain.find((c) => c.key === 'orders')?.value ?? 0;
  const withPhotos = chain.find((c) => c.key === 'with-photos')?.value ?? 0;
  const published = chain.find((c) => c.key === 'published')?.value ?? 0;

  return (
    <>
      <PageHeader
        title="Feed &amp; works"
        lede="The narrowest point in the product. Everything the consumer app can show a client has to come through here first."
        right={`${num(published)} published`}
      />

      <Section
        title="The publishing chain"
        subtitle="Each step is a strict subset of the one above it. A row that cannot reach the bottom is invisible to every client."
      >
        <HBars data={chain} ordinal notes={notes} />

        <Note tone="copper">
          Publishing has exactly one entry point: open an order, tap one of its photos, choose Publish. So an order
          with no photo can never produce public work — and only{' '}
          <strong className="font-semibold">
            {num(withPhotos)} of {num(orders)} orders
          </strong>{' '}
          carry one. The feed is starved at the source, not ignored at the end.
        </Note>

        <Note>
          Separately, {num(designs.total)} design {designs.total === 1 ? 'upload exists' : 'uploads exist'} across{' '}
          {num(designs.tailors)} {designs.tailors === 1 ? 'tailor' : 'tailors'}. Those live in the design studio and are
          not part of this chain — nothing in the app promotes a design upload to public work, so they cannot reach the
          feed at all.
        </Note>
      </Section>

      <Section title="Where it stands">
        <StatRow cols={4}>
          <Stat label="Portfolio works" value={num(works.length)} tone={works.length === 0 ? 'bad' : 'ink'} />
          <Stat label="Feed posts" value={num(posts.length)} tone={posts.length === 0 ? 'bad' : 'ink'} />
          <Stat label="Published" value={num(published)} tone={published === 0 ? 'bad' : 'ink'} hint="discoverable by clients" />
          <Stat label="Design uploads" value={num(designs.total)} tone="muted" hint="separate system, not publishable" />
        </StatRow>
      </Section>

      <Section
        title="By tailor"
        subtitle="How far each tailor's work gets down the chain. Photos is the column that gates everything to its right."
      >
        {byTailor.length === 0 ? (
          <Empty>No tailors yet.</Empty>
        ) : (
          <Table
            head={['Tailor', 'Orders', 'Photos', 'Works', 'Published', '']}
            align={['left', 'right', 'right', 'right', 'right', 'left']}
          >
            {byTailor.map((b) => (
              <Row key={b.id}>
                <LinkCell href={`/tailors/${b.id}`}>{b.tailor}</LinkCell>
                <Cell right mono>{b.orders}</Cell>
                <Cell right mono>{b.photos === 0 ? <span className="text-faint">0</span> : b.photos}</Cell>
                <Cell right mono>{b.works === 0 ? <span className="text-faint">0</span> : b.works}</Cell>
                <Cell right mono>{b.published === 0 ? <span className="text-faint">0</span> : b.published}</Cell>
                <Cell>
                  {b.photos === 0 && b.orders > 0 ? (
                    <Flag severity="warn" label="no photos to publish" />
                  ) : b.photos > 0 && b.published === 0 ? (
                    <Flag severity="warn" label="could publish, has not" />
                  ) : null}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Portfolio works" right={`${works.length} shown`}>
        {works.length === 0 ? (
          <Empty>Nothing saved to a portfolio yet.</Empty>
        ) : (
          <Table
            head={['Title', 'Tailor', 'Source', 'Garment', 'Audience', 'Occasion', 'On the feed', 'Created']}
            align={['left', 'left', 'left', 'left', 'left', 'left', 'left', 'right']}
          >
            {works.map((w) => (
              <Row key={w.id}>
                <Cell wide>{w.title ?? <span className="text-faint">untitled</span>}</Cell>
                <LinkCell href={`/tailors/${w.tailorId}`}>{w.tailor}</LinkCell>
                <Cell><Tag>{label(w.source)}</Tag></Cell>
                <Cell dim>{w.garmentType ?? '—'}</Cell>
                <Cell dim>{w.audience ?? '—'}</Cell>
                <Cell dim>{w.occasion ?? '—'}</Cell>
                <Cell>{w.published ? <Flag severity="ok" label="published" /> : <Flag severity="idle" label="private" />}</Cell>
                <Cell right dim mono>{date(w.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Feed posts" right={`${posts.length} shown`}>
        {posts.length === 0 ? (
          <Empty>Nothing has ever been published to the feed.</Empty>
        ) : (
          <Table
            head={['Caption', 'Tailor', 'Status', 'Garment', 'City', 'From', 'Created']}
            align={['left', 'left', 'left', 'left', 'left', 'right', 'right']}
          >
            {posts.map((p) => (
              <Row key={p.id}>
                <Cell wide>{p.caption ?? <span className="text-faint">no caption</span>}</Cell>
                <LinkCell href={`/tailors/${p.tailorId}`}>{p.tailor}</LinkCell>
                <Cell><Tag>{p.status}</Tag></Cell>
                <Cell dim>{p.garmentType ?? '—'}</Cell>
                <Cell dim>{p.city ?? '—'}</Cell>
                <Cell right mono>{p.startingPrice === null ? '—' : money(p.startingPrice, p.currency)}</Cell>
                <Cell right dim mono>{date(p.createdAt)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
