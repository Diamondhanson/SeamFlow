// A placeholder phone mockup — a CSS-drawn device wrapping a mini "midnight"
// app screen. No real screenshots needed (roadmap: use placeholders, easy to
// swap). Pass `variant` for different mock screens.

const MID = {
  bg: '#12121C',
  surface: '#1B1B28',
  elevated: '#26263A',
  line: 'rgba(255,255,255,0.08)',
  text: '#EDEBF6',
  muted: '#9A98AE',
  primary: '#8B79FF',
  accent: '#F0875A',
};

function Bar({ w, c = MID.line, h = 8 }: { w: string; c?: string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 999, background: c }} />;
}

function Tile({ tint }: { tint: string }) {
  return (
    <div
      style={{
        background: MID.surface,
        border: `1px solid ${MID.line}`,
        borderRadius: 14,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        aspectRatio: '1.35',
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 8, background: tint }} />
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Bar w="70%" c="rgba(255,255,255,0.16)" h={7} />
        <Bar w="45%" h={6} />
      </div>
    </div>
  );
}

function HomeMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div
        style={{
          background: MID.surface,
          border: `1px solid ${MID.line}`,
          borderRadius: 18,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Bar w="30%" c="rgba(255,255,255,0.12)" h={6} />
        <div style={{ color: MID.text, fontFamily: 'var(--font-display), serif', fontSize: 17, fontWeight: 700, letterSpacing: 0.3 }}>
          SEAMFLOW DESIGNS
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: MID.primary, fontWeight: 700, fontSize: 12 }}>3</span>
          <Bar w="24%" h={6} />
          <span style={{ color: MID.accent, fontWeight: 700, fontSize: 12 }}>0</span>
          <Bar w="20%" h={6} />
        </div>
      </div>
      <div
        style={{
          background: MID.primary,
          borderRadius: 999,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bar w="45%" c="rgba(18,18,28,0.55)" h={7} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Tile tint="rgba(139,121,255,0.5)" />
        <Tile tint="rgba(240,135,90,0.5)" />
        <Tile tint="rgba(47,191,149,0.5)" />
        <Tile tint="rgba(216,159,74,0.5)" />
      </div>
    </div>
  );
}

function OrderMock() {
  const Pill = ({ label, c }: { label: string; c: string }) => (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: c,
        background: `${c}22`,
        border: `1px solid ${c}44`,
        borderRadius: 999,
        padding: '3px 9px',
      }}
    >
      {label}
    </span>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ color: MID.text, fontFamily: 'var(--font-display), serif', fontSize: 18, fontWeight: 700 }}>
        Order
      </div>
      {[
        { n: 'Wedding gown', c: MID.primary, s: 'Fitting' },
        { n: 'Two-piece suit', c: MID.accent, s: 'In progress' },
        { n: 'Aso-ebi set', c: '#2FBF95', s: 'Delivered' },
      ].map((o) => (
        <div
          key={o.n}
          style={{
            background: MID.surface,
            border: `1px solid ${MID.line}`,
            borderRadius: 14,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 999, background: `${o.c}55` }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: MID.text, fontSize: 12, fontWeight: 600 }}>{o.n}</span>
            <Bar w="55%" h={6} />
          </div>
          <Pill label={o.s} c={o.c} />
        </div>
      ))}
    </div>
  );
}

// ── Landscape tablet mock ───────────────────────────────────────────────────
function TabletHomeMock() {
  const tints = [
    'rgba(139,121,255,0.55)',
    'rgba(240,135,90,0.55)',
    'rgba(47,191,149,0.55)',
    'rgba(216,159,74,0.55)',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* greeting */}
      <div
        style={{
          background: MID.surface,
          border: `1px solid ${MID.line}`,
          borderRadius: 16,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Bar w="16%" h={6} c="rgba(255,255,255,0.12)" />
          <div
            style={{
              color: MID.text,
              fontFamily: 'var(--font-display), serif',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            SEAMFLOW DESIGNS
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: MID.primary, fontWeight: 700, fontSize: 12 }}>3</span>
            <Bar w="14%" h={6} />
            <span style={{ color: MID.accent, fontWeight: 700, fontSize: 12 }}>0</span>
            <Bar w="12%" h={6} />
          </div>
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #8B79FF, #F0875A)',
          }}
        />
      </div>

      {/* tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {tints.map((t, i) => (
          <Tile key={i} tint={t} />
        ))}
      </div>

      {/* order rail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[MID.primary, MID.accent, '#2FBF95'].map((c, i) => (
          <div
            key={i}
            style={{
              background: MID.surface,
              border: `1px solid ${MID.line}`,
              borderRadius: 12,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: 999, background: `${c}55` }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Bar w="80%" c="rgba(255,255,255,0.16)" h={6} />
              <Bar w="55%" h={5} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabletFrame({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 560,
        borderRadius: 30,
        padding: 14,
        background: 'linear-gradient(160deg, #2A2A3D, #16161F)',
        boxShadow: '0 40px 90px -40px rgba(90,70,224,0.6), 0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 22,
          background: MID.bg,
          padding: 16,
          height: 352,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
          }}
        />
        <div style={{ height: '100%' }}>
          <TabletHomeMock />
        </div>
      </div>
    </div>
  );
}

const MOCKS: Record<string, () => JSX.Element> = {
  home: HomeMock,
  order: OrderMock,
};

export function PhoneFrame({
  variant = 'home',
  className = '',
}: {
  variant?: 'home' | 'order';
  className?: string;
}) {
  const Screen = MOCKS[variant] ?? HomeMock;
  return (
    <div
      className={className}
      style={{
        width: 260,
        borderRadius: 40,
        padding: 12,
        background: 'linear-gradient(160deg, #2A2A3D, #16161F)',
        boxShadow: '0 30px 70px -30px rgba(90,70,224,0.55), 0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 30,
          background: MID.bg,
          padding: '18px 14px 14px',
          height: 500,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 90,
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.14)',
          }}
        />
        <div style={{ marginTop: 14, height: 'calc(100% - 14px)' }}>
          <Screen />
        </div>
      </div>
    </div>
  );
}
