// Small inline stroke icons (24×24, currentColor). Keeps the marketing site
// self-contained — no icon dependency, no external requests.

type IconProps = { className?: string };

const S = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Icons: Record<string, (p: IconProps) => JSX.Element> = {
  clients: ({ className }) => (
    <S className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2.3-4.5" />
    </S>
  ),
  orders: ({ className }) => (
    <S className={className}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </S>
  ),
  groups: ({ className }) => (
    <S className={className}>
      <path d="M12 3.5 4.5 8v8L12 20.5 19.5 16V8L12 3.5Z" />
      <path d="M12 3.5v17M4.5 8l7.5 4.2L19.5 8" />
    </S>
  ),
  design: ({ className }) => (
    <S className={className}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.9 2-1.8 0-1.2-1.1-1.6-1.1-2.6 0-.7.6-1.3 1.4-1.3H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.4 16.7 3.5 12 3.5Z" />
      <circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </S>
  ),
  reminders: ({ className }) => (
    <S className={className}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </S>
  ),
  share: ({ className }) => (
    <S className={className}>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.1 10.9 15.9 7.1M8.1 13.1l7.8 3.8" />
    </S>
  ),
  offline: ({ className }) => (
    <S className={className}>
      <path d="M5 16a4 4 0 0 1 1.3-7.8A5.5 5.5 0 0 1 17 8.5a3.8 3.8 0 0 1 2.5 6.9" />
      <path d="M3.5 3.5l17 17" />
    </S>
  ),
  fabric: ({ className }) => (
    <S className={className}>
      <path d="M4 7.5 8 5l4 2.5L16 5l4 2.5v9L16 19l-4-2.5L8 19l-4-2.5v-9Z" />
      <path d="M8 5v14M16 5v14" />
    </S>
  ),
  // Chat bubble with a spark — the AI tailor assistant.
  assistant: ({ className }) => (
    <S className={className}>
      <path d="M20.5 11.4c0 3.9-3.8 7-8.5 7-.9 0-1.8-.1-2.6-.3L4.5 20l1.2-3.4A6.6 6.6 0 0 1 3.5 11.4c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
      <path d="M12 8.1c.3 1.9.8 2.4 2.7 2.7-1.9.3-2.4.8-2.7 2.7-.3-1.9-.8-2.4-2.7-2.7 1.9-.3 2.4-.8 2.7-2.7Z" />
    </S>
  ),
  // Camera viewfinder over a written sheet — scan measurements from paper.
  scan: ({ className }) => (
    <S className={className}>
      <path d="M3.5 8V5.8c0-1.3 1-2.3 2.3-2.3H8M16 3.5h2.2c1.3 0 2.3 1 2.3 2.3V8M20.5 16v2.2c0 1.3-1 2.3-2.3 2.3H16M8 20.5H5.8c-1.3 0-2.3-1-2.3-2.3V16" />
      <path d="M8.5 9.5h7M8.5 12.8h7M8.5 16h4" />
    </S>
  ),
  // Receipt with a torn edge — invoices & deposits.
  invoices: ({ className }) => (
    <S className={className}>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17Z" />
      <path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" />
    </S>
  ),
  calendar: ({ className }) => (
    <S className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.8h17M8 3.5v3M16 3.5v3" />
      <circle cx="12" cy="14.6" r="1.15" fill="currentColor" stroke="none" />
    </S>
  ),
  // Laptop with a phone beside it — phone, tablet or browser.
  devices: ({ className }) => (
    <S className={className}>
      <path d="M3.5 5.8c0-.7.6-1.3 1.3-1.3h9.4c.7 0 1.3.6 1.3 1.3v8.4H3.5V5.8Z" />
      <path d="M2 17.2h15.5" />
      <rect x="17.8" y="8.5" width="4.7" height="11" rx="1.4" />
    </S>
  ),
  voice: ({ className }) => (
    <S className={className}>
      <rect x="9" y="3" width="6" height="10.5" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </S>
  ),
  shield: ({ className }) => (
    <S className={className}>
      <path d="M12 3.2 5 6v5.7c0 4 2.9 7.5 7 9.1 4.1-1.6 7-5.1 7-9.1V6l-7-2.8Z" />
      <path d="M9 12.2l2.1 2.1L15 10.4" />
    </S>
  ),
  check: ({ className }) => (
    <S className={className}>
      <path d="M5 12.5 10 17l9-10" />
    </S>
  ),
  // `arrow` points toward the inline END (forward / onward), `arrowBack` toward
  // the inline START. Both carry the RTL flip themselves, so no call site has to
  // think about direction — and nobody reaches for `rotate-180` again, which is
  // what made these two meanings share one glyph in the first place.
  arrow: ({ className }) => (
    <S className={`rtl:-scale-x-100 ${className ?? ''}`}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </S>
  ),
  arrowBack: ({ className }) => (
    <S className={`rtl:-scale-x-100 ${className ?? ''}`}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </S>
  ),
  chevron: ({ className }) => (
    <S className={className}>
      <path d="M6 9l6 6 6-6" />
    </S>
  ),
  globe: ({ className }) => (
    <S className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" />
    </S>
  ),
  spark: ({ className }) => (
    <S className={className}>
      <path d="M12 3.5c.6 3.9 1.6 4.9 5.5 5.5-3.9.6-4.9 1.6-5.5 5.5-.6-3.9-1.6-4.9-5.5-5.5 3.9-.6 4.9-1.6 5.5-5.5Z" />
    </S>
  ),
  // SeamFlow scissors mark — the brand logo, drawn as a stroke icon so it
  // inherits currentColor like every other icon here. The filled/gradient
  // version lives in assets/brand for icons and app stores.
  logo: ({ className }) => (
    <S className={className}>
      <circle cx="7" cy="17.2" r="3" strokeWidth={1.7} />
      <circle cx="17" cy="17.2" r="3" strokeWidth={1.7} />
      <path d="M8.8 14.6 17.5 3.6" strokeWidth={1.7} />
      <path d="M15.2 14.6 6.5 3.6" strokeWidth={1.7} />
      <circle cx="12" cy="11.4" r=".85" fill="currentColor" strokeWidth={0} />
    </S>
  ),
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = Icons[name] ?? Icons.spark;
  return <C className={className} />;
}
