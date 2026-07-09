import { ImageResponse } from 'next/og';

export const alt = 'SeamFlow — your whole workshop, in one calm place.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded OG share image, generated at request time. Uses ImageResponse's
// default font (no external font fetch) so it works in a local/offline build.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'linear-gradient(135deg, #5A46E0 0%, #4634C4 55%, #2B1F86 100%)',
          color: '#FBF8F3',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            ✂
          </div>
          SeamFlow
        </div>
        <div style={{ marginTop: 40, fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          Your whole workshop, in one calm place.
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(251,248,243,0.82)' }}>
          Clients · measurements · orders · reminders — for tailors & designers.
        </div>
      </div>
    ),
    { ...size },
  );
}
