'use client';

// ============================================================================
// Filters, in one row above the data, with the state held in the URL.
//
// The URL is the store on purpose: a filtered view is then a link you can
// paste, reload, or come back to tomorrow, and the server component can read
// the same values straight out of searchParams without any client state
// crossing the boundary. Back and forward work because they are real
// navigations rather than something re-implemented in a reducer.
// ============================================================================

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

function useSetParam() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    // Any filter change invalidates the page you were on.
    if (!('page' in patch)) next.delete('page');
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  };

  return { set, get: (k: string) => params.get(k) ?? '', pending };
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3 border-y border-rule bg-surface px-4 py-3">
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-2xs uppercase tracking-widest text-faint">{children}</span>;
}

/**
 * Debounced so a five-character search is one navigation rather than five —
 * the database is ~7.7s of latency away when cold and does not deserve a
 * request per keystroke.
 */
export function Search({ name = 'q', placeholder = 'Search…' }: { name?: string; placeholder?: string }) {
  const { set, get } = useSetParam();
  const initial = get(name);
  const [value, setValue] = useState(initial);

  // Keep in step when the URL changes underneath us (back button, a cleared
  // filter, a link from another page).
  useEffect(() => setValue(initial), [initial]);

  useEffect(() => {
    if (value === initial) return;
    const t = setTimeout(() => set({ [name]: value || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="min-w-[13rem] flex-1">
      <Label>Search</Label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
      />
    </label>
  );
}

export function Choice({
  name,
  label,
  options,
  allLabel = 'All',
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const { set, get } = useSetParam();
  return (
    <label>
      <Label>{label}</Label>
      <select
        value={get(name)}
        onChange={(e) => set({ [name]: e.target.value || null })}
        className="border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Segmented time range. Written into the URL as a day count, `all` for none. */
export function Range({ name = 'range' }: { name?: string }) {
  const { set, get } = useSetParam();
  const current = get(name) || 'all';
  const opts = [
    ['30', '30d'],
    ['90', '90d'],
    ['365', '1y'],
    ['all', 'All'],
  ];
  return (
    <div>
      <Label>Period</Label>
      <div className="flex border border-rule">
        {opts.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => set({ [name]: v === 'all' ? null : v })}
            aria-pressed={current === v}
            className={`border-r border-rule px-2.5 py-1.5 text-xs last:border-r-0 ${
              current === v ? 'bg-primary text-white' : 'bg-paper text-muted hover:text-ink'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Reset() {
  const router = useRouter();
  const params = useSearchParams();
  if ([...params.keys()].length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => router.push('?', { scroll: false })}
      className="py-1.5 text-xs text-copper underline underline-offset-4 hover:text-ink"
    >
      Clear filters
    </button>
  );
}
