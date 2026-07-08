import { notFound } from 'next/navigation';
import { ApiError } from '@seamflow/api-client';
import type { PublicInvoiceResponse } from '@seamflow/schemas';
import { publicApi } from '../../../lib/api';
import { DownloadButton } from './DownloadButton';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const revalidate = 1800; // 30 minutes

const CATEGORY_LABEL: Record<string, string> = {
  garment: 'Garment',
  workmanship: 'Workmanship',
  fabric: 'Fabric',
  extra: 'Extra',
  custom: 'Item',
};

async function loadPayload(token: string): Promise<PublicInvoiceResponse> {
  const api = publicApi();
  return api.invoices.resolvePublic(token);
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;

  let inv: PublicInvoiceResponse;
  try {
    inv = await loadPayload(token);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) notFound();
      if (err.status === 401 || err.status === 410) {
        return <ExpiredOrInvalid status={err.status} message={err.message} />;
      }
    }
    throw err;
  }

  const balance = inv.total - inv.deposit;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-12 sm:pt-16">
      {/* Masthead */}
      <header className="mb-10 text-center">
        <div className="mx-auto mb-5 h-px w-12 bg-accent/70" />
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          {inv.tailor.businessName}
        </h2>
        {inv.tailor.location ? (
          <p className="mt-1 text-sm text-muted">{inv.tailor.location}</p>
        ) : null}
      </header>

      {/* Invoice card */}
      <section className="rounded-4xl border border-border/70 bg-surface/80 p-6 shadow-card backdrop-blur-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Invoice
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              {inv.number}
            </h1>
          </div>
          <span className="shrink-0 rounded-full bg-background px-3 py-1.5 font-mono text-xs text-muted tabular">
            {formatDate(inv.issuedAt ?? inv.createdAt)}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
          <Cell label="Billed to" value={inv.client.fullName} />
          <Cell label="For" value={inv.order.orderName} />
        </dl>

        {/* Line items */}
        <div className="mt-7 overflow-hidden rounded-2xl border border-hairline">
          <div className="flex items-center justify-between bg-background/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <ul>
            {inv.lineItems.map((l) => (
              <li
                key={l.id}
                className="flex items-baseline justify-between gap-4 border-t border-hairline bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] text-ink">
                    {l.description || CATEGORY_LABEL[l.category] || 'Item'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {CATEGORY_LABEL[l.category] ?? l.category}
                    {l.quantity > 1
                      ? ` · ${l.quantity} × ${formatMoney(l.unitPrice, inv.currency)}`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[15px] text-ink tabular">
                  {formatMoney(l.quantity * l.unitPrice, inv.currency)}
                </span>
              </li>
            ))}
            {inv.lineItems.length === 0 ? (
              <li className="border-t border-hairline bg-surface px-4 py-6 text-center text-sm text-muted">
                No items on this invoice.
              </li>
            ) : null}
          </ul>
        </div>

        {/* Totals */}
        <dl className="mt-6 space-y-2">
          <TotalRow label="Subtotal" value={formatMoney(inv.total, inv.currency)} />
          {inv.deposit > 0 ? (
            <TotalRow
              label="Deposit paid"
              value={`− ${formatMoney(inv.deposit, inv.currency)}`}
            />
          ) : null}
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-display text-lg font-semibold text-ink">
              Balance due
            </dt>
            <dd className="font-mono text-lg font-semibold text-ink tabular">
              {formatMoney(balance, inv.currency)}
            </dd>
          </div>
        </dl>

        {inv.notes ? (
          <div className="mt-6 rounded-2xl border border-hairline bg-background/60 p-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Notes
            </p>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
              {inv.notes}
            </p>
          </div>
        ) : null}
      </section>

      <DownloadButton />

      {/* Footer */}
      <footer className="mt-14 text-center">
        <div className="mx-auto mb-5 h-px w-16 bg-border" />
        <p className="text-xs text-muted">
          This link expires{' '}
          <time dateTime={inv.effectiveExpiresAt} className="text-ink/70">
            {formatDate(inv.effectiveExpiresAt)}
          </time>
          .
        </p>
        <p className="mt-2 text-xs text-muted">
          Sent by {inv.tailor.businessName} via{' '}
          <span className="font-display font-semibold text-ink/80">SeamFlow</span>.
        </p>
      </footer>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-medium text-ink">{value}</p>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-mono text-[15px] text-ink/90 tabular">{value}</dd>
    </div>
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
      <p className="mt-6 text-sm text-muted">Ask your tailor for a fresh link.</p>
      <p className="mt-10 text-xs text-muted">
        <span className="font-display font-semibold text-ink/70">SeamFlow</span>
      </p>
    </main>
  );
}

function formatMoney(amount: number, currency: string | null): string {
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      /* fall through */
    }
  }
  return (
    amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
    (currency ? ` ${currency}` : '')
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
