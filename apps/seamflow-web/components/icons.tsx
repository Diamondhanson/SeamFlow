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
  check: ({ className }) => (
    <S className={className}>
      <path d="M5 12.5 10 17l9-10" />
    </S>
  ),
  arrow: ({ className }) => (
    <S className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
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
  logo: ({ className }) => (
    <S className={className}>
      {/* stitch: a needle path through cloth — the SeamFlow mark */}
      <path d="M4 15c3-6 5-9 8-9s5 3 8 9" />
      <path d="M4 15c3 3 5 4 8 4s5-1 8-4" strokeDasharray="0.1 3.4" />
    </S>
  ),
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = Icons[name] ?? Icons.spark;
  return <C className={className} />;
}
