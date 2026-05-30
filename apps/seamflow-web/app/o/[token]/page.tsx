import { notFound } from 'next/navigation';
import { ApiError } from '@seamflow/api-client';
import type { PublicOrderResponse } from '@seamflow/schemas';
import { publicApi } from '../../../lib/api';

interface PageProps {
  params: Promise<{ token: string }>;
}

// Photos are signed with a 1h TTL on the API. If a slow client reloads after
// expiry, the URLs would 403 — so don't cache the page for longer than that.
export const revalidate = 1800; // 30 minutes

// Each status carries a label and an Atelier hue. The chip renders as a soft
// tinted pill (low-alpha fill + a solid dot) rather than a loud solid badge —
// it reads as a status, not an alert.
const STATUS: Record<string, { label: string; color: string }> = {
  registered: { label: 'Registered', color: '#5B554F' }, // inkMuted
  in_progress: { label: 'In progress', color: '#2E3A8C' }, // indigo
  testing: { label: 'Fitting', color: '#D89F4A' }, // amber
  on_pause: { label: 'On pause', color: '#B4564B' }, // rose
  delivered: { label: 'Delivered', color: '#8FA68E' }, // sage
};

async function loadPayload(token: string): Promise<PublicOrderResponse> {
  const api = publicApi();
  return api.shareLinks.resolvePublic(token);
}

export default async function PublicOrderPage({ params }: PageProps) {
  const { token } = await params;

  let payload: PublicOrderResponse;
  try {
    payload = await loadPayload(token);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) notFound();
      if (err.status === 401 || err.status === 410) {
        return <ExpiredOrInvalid status={err.status} message={err.message} />;
      }
    }
    throw err;
  }

  const { order, items, photos, tailor, effectiveExpiresAt } = payload;
  const status = STATUS[order.status] ?? {
    label: order.status,
    color: '#5B554F',
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-12 sm:pt-16">
      {/* Masthead — the tailor's name in the brand serif, with a slim
          copper rule above it as a signature mark. */}
      <header className="mb-10 text-center">
        <div className="mx-auto mb-5 h-px w-12 bg-accent/70" />
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          {tailor.businessName}
        </h2>
        {tailor.location ? (
          <p className="mt-1 text-sm text-muted">{tailor.location}</p>
        ) : null}
      </header>

      {/* Order card */}
      <section className="rounded-4xl border border-border/70 bg-surface/80 p-6 shadow-card backdrop-blur-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Your order
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              {order.orderName}
            </h1>
          </div>
          <StatusPill label={status.label} color={status.color} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
          <DateCell label="Ordered" value={formatDate(order.dateOrdered)} />
          <DateCell
            label="Delivery"
            value={order.dateDelivery ? formatDate(order.dateDelivery) : '—'}
            accent
          />
        </dl>

        {order.notes ? (
          <div className="mt-6 rounded-2xl border border-hairline bg-background/60 p-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Notes
            </p>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
              {order.notes}
            </p>
          </div>
        ) : null}
      </section>

      {/* Photos */}
      {photos.length > 0 ? (
        <section className="mt-10">
          <SectionLabel>Photos</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => {
              const src = p.signedUrl ?? p.thumbnailUrl;
              if (!src) return null;
              return (
                <a
                  key={p.id}
                  href={p.signedUrl ?? src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnailUrl ?? src}
                    alt={p.caption ?? p.role}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Items */}
      <section className="mt-10">
        <SectionLabel>
          Items{items.length > 0 ? ` · ${items.length}` : ''}
        </SectionLabel>
        {items.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border/70 bg-surface/40 px-4 py-6 text-center text-sm text-muted">
            No items added to this order yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-3xl border border-border/70 bg-surface/80 p-5 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg font-semibold capitalize text-ink">
                    {it.garmentType}
                  </span>
                  <span className="rounded-full bg-background px-2.5 py-0.5 font-mono text-xs text-muted tabular">
                    ×{it.quantity}
                  </span>
                </div>
                {it.measurements &&
                Object.keys(it.measurements).length > 0 ? (
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    {Object.entries(it.measurements).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-baseline justify-between border-b border-hairline pb-1.5"
                      >
                        <dt className="capitalize text-muted">{k}</dt>
                        <dd className="font-mono text-ink tabular">
                          {String(v)}
                          <span className="ml-0.5 text-xs text-muted">cm</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {it.notes ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink/80">
                    {it.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-14 text-center">
        <div className="mx-auto mb-5 h-px w-16 bg-border" />
        <p className="text-xs text-muted">
          This link expires{' '}
          <time dateTime={effectiveExpiresAt} className="text-ink/70">
            {formatDate(effectiveExpiresAt)}
          </time>
          .
        </p>
        <p className="mt-2 text-xs text-muted">
          Sent by {tailor.businessName} via{' '}
          <span className="font-display font-semibold text-ink/80">
            SeamFlow
          </span>
          .
        </p>
      </footer>
    </main>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-pill"
      style={{
        color,
        backgroundColor: `${color}1a`, // ~10% alpha tint
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function DateCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-medium ${
          accent ? 'text-primary' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
      {children}
    </h2>
  );
}

function ExpiredOrInvalid({
  status,
  message,
}: {
  status: number;
  message: string;
}) {
  const isExpired = status === 410;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-6 h-px w-12 bg-accent/70" />
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        {isExpired ? 'Link expired' : 'Invalid link'}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{message}</p>
      <p className="mt-6 text-sm text-muted">
        Ask your tailor for a fresh link.
      </p>
      <p className="mt-10 text-xs text-muted">
        <span className="font-display font-semibold text-ink/70">SeamFlow</span>
      </p>
    </main>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
