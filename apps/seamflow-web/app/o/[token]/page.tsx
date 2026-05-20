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

const STATUS_LABEL: Record<string, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Fitting',
  on_pause: 'On pause',
  delivered: 'Delivered',
};

const STATUS_COLOR: Record<string, string> = {
  registered: 'bg-gray-500',
  in_progress: 'bg-accent',
  testing: 'bg-amber-500',
  on_pause: 'bg-rose-500',
  delivered: 'bg-emerald-600',
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wider text-muted">
          {tailor.businessName}
        </p>
        {tailor.location ? (
          <p className="text-xs text-muted">{tailor.location}</p>
        ) : null}
      </header>

      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {order.orderName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Ordered {formatDate(order.dateOrdered)}
              {order.dateDelivery
                ? ` · Delivery ${formatDate(order.dateDelivery)}`
                : ''}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium text-white ${
              STATUS_COLOR[order.status] ?? 'bg-gray-500'
            }`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        {order.notes ? (
          <p className="mt-4 whitespace-pre-line text-sm text-ink/80">
            {order.notes}
          </p>
        ) : null}
      </section>

      {photos.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted">
            Photos
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => {
              const src = p.signedUrl ?? p.thumbnailUrl;
              if (!src) return null;
              return (
                <a
                  key={p.id}
                  href={p.signedUrl ?? src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnailUrl ?? src}
                    alt={p.caption ?? p.role}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted">
          Items
        </h2>
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-xl bg-surface p-4 ring-1 ring-border"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium capitalize">{it.garmentType}</span>
                <span className="text-sm text-muted">×{it.quantity}</span>
              </div>
              {it.measurements && Object.keys(it.measurements).length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(it.measurements).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-muted">{k}</dt>
                      <dd>{String(v)} cm</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {it.notes ? (
                <p className="mt-2 text-sm text-ink/80">{it.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted">
        <p>
          This link expires{' '}
          <time dateTime={effectiveExpiresAt}>
            {formatDate(effectiveExpiresAt)}
          </time>
          .
        </p>
        <p className="mt-1">Sent by {tailor.businessName} via SeamFlow.</p>
      </footer>
    </main>
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
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isExpired ? 'Link expired' : 'Invalid link'}
      </h1>
      <p className="mt-3 text-muted">{message}</p>
      <p className="mt-6 text-sm text-muted">
        Ask your tailor for a fresh link.
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
