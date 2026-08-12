'use client';

// ============================================================================
// Charts, built from divs and one SVG path. No charting library.
//
// WHY NO LIBRARY. Every chart here is one of four shapes, all of them simple,
// and a library would arrive with its own opinions about radius, palette and
// tooltips that this app then spends more code overriding than drawing.
//
// WHY DIVS FOR BARS. An SVG scaled with a viewBox scales its text and stroke
// widths too, so a chart that looks right at 900px has 9px axis labels at
// 600px. Flexbox bars are crisp at any width for free. The line chart is the
// one shape divs cannot make, so it is the one SVG — and its stroke carries
// `vector-effect: non-scaling-stroke` while its labels live in an HTML layer
// on top, so nothing in it scales either.
//
// TWO DEPARTURES from the house chart specs, both deliberate:
//   · Square data-ends, not 4px rounded. This app renders every corner square
//     by decree; a rounded bar cap here would be the only curve on the page.
//   · Stat values in sans, not the display serif. Fraunces is right for a
//     heading and wrong for a figure — at size its numerals read as ornament.
//
// Everything else is house spec: ≤24px bars, 2px surface gaps, 2px lines,
// hairline recessive grid, labels only where they earn their place, and a
// hover layer on every chart that plots anything.
// ============================================================================

import { useState } from 'react';
import { money, num } from '../lib/format';
import { CHART, ORDINAL, SOLO, ordinalSteps } from '../lib/palette';

/**
 * Charts take a CURRENCY CODE, never a formatter function.
 *
 * These are client components rendered from server components, and a function
 * cannot cross that boundary — React can only serialise data. Passing
 * `format={(v) => money(v, currency)}` type-checks perfectly and then fails at
 * runtime with "Functions cannot be passed directly to Client Components",
 * which is why the prop is a string: a string survives the trip, and the
 * formatting decision is the same one either way.
 */
const fmt = (currency?: string | null) => (v: number) =>
  currency ? money(v, currency) : num(v);

// ---------------------------------------------------------------------------
// Tooltip — one implementation, shared by every chart
// ---------------------------------------------------------------------------

function Tip({ x, y, title, rows }: { x: number; y: number; title: string; rows: [string, string][] }) {
  return (
    <div
      className="pointer-events-none absolute z-20 border border-ruleStrong bg-paper px-3 py-2 shadow-[0_2px_10px_rgba(26,23,20,0.14)]"
      style={{ left: x, top: y, transform: 'translate(-50%, -115%)', minWidth: 120 }}
    >
      <div className="text-2xs uppercase tracking-widest text-faint whitespace-nowrap">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 whitespace-nowrap">
          <span className="text-xs text-muted">{k}</span>
          <span className="font-mono tnum text-sm text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Round an axis maximum up to something a human would have chosen. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const steps = [1, 2, 2.5, 5, 10];
  return mag * (steps.find((s) => v / mag <= s) ?? 10);
}

// ---------------------------------------------------------------------------
// Columns — a value per time bucket, one series
// ---------------------------------------------------------------------------

export interface Point {
  key: string;
  label: string;
  value: number;
}

export function Columns({
  data,
  height = 150,
  color = SOLO,
  currency,
  unit,
}: {
  data: Point[];
  height?: number;
  color?: string;
  /** ISO 4217 code when the values are money. Omit for plain counts. */
  currency?: string | null;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const format = fmt(currency);
  if (data.length === 0) return <NoData height={height} />;

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  // Label every bucket when there is room, otherwise roughly six, so the axis
  // never turns into an unreadable smear of overlapping months.
  const every = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="relative">
      <div className="flex" style={{ height }}>
        {/* Y axis: three ticks. Any more competes with the data for attention. */}
        <div className="relative w-12 shrink-0 pr-2">
          {[max, max / 2, 0].map((t, i) => (
            <div
              key={t}
              className="absolute right-2 -translate-y-1/2 font-mono tnum text-2xs text-faint"
              style={{ top: `${i * 50}%` }}
            >
              {format(t)}
            </div>
          ))}
        </div>

        <div className="relative flex-1">
          {[0, 50, 100].map((p) => (
            <div
              key={p}
              className="absolute inset-x-0"
              style={{ top: `${p}%`, borderTop: `1px solid ${p === 100 ? CHART.axis : CHART.grid}` }}
            />
          ))}

          {/* 2px surface gaps between neighbours; bars capped at 24px so a
              four-bucket chart doesn't render four slabs. */}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.key}
                className="flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full max-w-[24px] transition-[height]"
                  style={{
                    height: `${Math.max(d.value > 0 ? 1.5 : 0, (d.value / max) * 100)}%`,
                    background: color,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex pl-12">
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 pt-2 text-center text-2xs text-faint">
            {i % every === 0 ? d.label : ' '}
          </div>
        ))}
      </div>

      {hover !== null ? (
        <Tip
          x={48 + ((hover + 0.5) / data.length) * (100 - 0)}
          y={height}
          title={data[hover].label}
          rows={[[unit ?? 'Count', format(data[hover].value)]]}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HBars — a labelled row per category
// ---------------------------------------------------------------------------

export function HBars({
  data,
  ordinal = false,
  colors,
  currency,
  notes,
}: {
  data: Point[];
  /** True when the row ORDER carries meaning (funnel stages, order status). */
  ordinal?: boolean;
  /**
   * Colour pinned per key, overriding the positional ramp. Use this whenever
   * rows can be missing — a status with no rows drops out of the query, every
   * row below it shifts up, and a positional ramp would recolour them all.
   */
  colors?: Record<string, string>;
  /** ISO 4217 code when the values are money. Omit for plain counts. */
  currency?: string | null;
  notes?: Record<string, string>;
}) {
  const format = fmt(currency);
  if (data.length === 0) return <NoData height={80} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const steps = ordinal ? ordinalSteps(data.length) : null;

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.key} className="grid grid-cols-12 items-center gap-4">
          <div className="col-span-12 sm:col-span-4">
            <div className="text-sm text-ink">{d.label}</div>
            {notes?.[d.key] ? <div className="mt-0.5 text-xs text-faint">{notes[d.key]}</div> : null}
          </div>
          <div className="col-span-9 sm:col-span-6">
            <div className="h-2.5 w-full" style={{ background: CHART.fill }}>
              <div
                className="h-2.5"
                style={{
                  // A zero renders as a hairline rather than nothing: an
                  // invisible bar reads as "not measured" when it means "none".
                  width: `${Math.max(d.value > 0 ? 2 : 0.7, (d.value / max) * 100)}%`,
                  background: colors?.[d.key] ?? (steps ? steps[i] : SOLO),
                }}
              />
            </div>
          </div>
          <div className="col-span-3 sm:col-span-2 text-right font-mono tnum text-sm">
            {format(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lines — up to two series over time, with a crosshair
// ---------------------------------------------------------------------------

export interface Series {
  name: string;
  color: string;
  points: Point[];
}

export function Lines({
  series,
  height = 170,
  currency,
}: {
  series: Series[];
  height?: number;
  /** ISO 4217 code when the values are money. Omit for plain counts. */
  currency?: string | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const format = fmt(currency);
  const len = series[0]?.points.length ?? 0;
  if (len === 0) return <NoData height={height} />;

  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const W = 1000;
  const H = 100;
  const x = (i: number) => (len === 1 ? W / 2 : (i / (len - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const path = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const every = Math.max(1, Math.ceil(len / 8));

  return (
    <div>
      {series.length > 1 ? (
        <div className="mb-3 flex gap-5">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-[2px] w-4" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex" style={{ height }}>
        <div className="relative w-12 shrink-0 pr-2">
          {[max, max / 2, 0].map((t, i) => (
            <div
              key={t}
              className="absolute right-2 -translate-y-1/2 font-mono tnum text-2xs text-faint"
              style={{ top: `${i * 50}%` }}
            >
              {format(t)}
            </div>
          ))}
        </div>

        <div
          className="relative flex-1"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left) / r.width) * (len - 1));
            setHover(Math.min(len - 1, Math.max(0, i)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 50, 100].map((p) => (
            <div
              key={p}
              className="absolute inset-x-0"
              style={{ top: `${p}%`, borderTop: `1px solid ${p === 100 ? CHART.axis : CHART.grid}` }}
            />
          ))}

          {hover !== null ? (
            <div
              className="absolute inset-y-0 w-px"
              style={{ left: `${(hover / Math.max(1, len - 1)) * 100}%`, background: CHART.axis }}
            />
          ) : null}

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {series.map((s) => (
              <path
                key={s.name}
                d={path(s.points)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                // Without this the 2px stroke is stretched by the viewBox and
                // renders at a different weight on every screen width.
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Markers live in HTML so they stay circular — a circle inside a
              non-uniformly scaled viewBox comes out an ellipse. */}
          {hover !== null
            ? series.map((s) => (
                <span
                  key={s.name}
                  className="absolute block h-2 w-2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(hover / Math.max(1, len - 1)) * 100}%`,
                    top: `${(y(s.points[hover].value) / H) * 100}%`,
                    background: s.color,
                    // 2px surface ring keeps the dot legible where the two
                    // series cross each other.
                    boxShadow: `0 0 0 2px ${CHART.surface}`,
                  }}
                />
              ))
            : null}
        </div>
      </div>

      <div className="flex pl-12">
        {series[0].points.map((p, i) => (
          <div key={p.key} className="flex-1 pt-2 text-center text-2xs text-faint">
            {i % every === 0 ? p.label : ' '}
          </div>
        ))}
      </div>

      {hover !== null ? (
        <div className="relative">
          <Tip
            x={48 + (hover / Math.max(1, len - 1)) * 100}
            y={0}
            title={series[0].points[hover].label}
            rows={series.map((s) => [s.name, format(s.points[hover].value)] as [string, string])}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meter — one proportion, e.g. settled against outstanding
// ---------------------------------------------------------------------------

export function Meter({
  parts,
}: {
  parts: { label: string; value: number; formatted: string; tone: 'filled' | 'track' }[];
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px]">
        {parts.map((p) => (
          <div
            key={p.label}
            title={`${p.label}: ${p.formatted}`}
            style={{
              width: `${total > 0 ? Math.max(p.value > 0 ? 1 : 0, (p.value / total) * 100) : 0}%`,
              // Track is a lighter step of the SAME hue, not grey, so the
              // proportion reads across the whole bar rather than only in the
              // filled part.
              background: p.tone === 'filled' ? ORDINAL[3] : ORDINAL[0],
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-2 text-xs text-muted">
            <span
              className="inline-block h-2 w-2"
              style={{ background: p.tone === 'filled' ? ORDINAL[3] : ORDINAL[0] }}
            />
            {p.label} <span className="font-mono tnum text-ink">{p.formatted}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Sparkline({ points, color = SOLO, width = 90, height = 22 }: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return <span className="text-faint">—</span>;
  const max = Math.max(...points, 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * width} ${height - (v / max) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible align-middle">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function NoData({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center border border-dashed text-xs italic text-faint"
      style={{ height, borderColor: CHART.grid }}
    >
      Nothing to plot yet
    </div>
  );
}
