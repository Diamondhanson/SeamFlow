import { ImageResponse } from 'next/og';

export const alt = 'SeamFlow: your whole workshop, in one calm place.';
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
            'linear-gradient(135deg, #C45BFF 0%, #7B30E8 55%, #5A18C9 100%)',
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
            {/* SeamFlow scissors mark */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FBF8F3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="17.2" r="3" />
              <circle cx="17" cy="17.2" r="3" />
              <path d="M8.8 14.6 17.5 3.6" />
              <path d="M15.2 14.6 6.5 3.6" />
              <circle cx="12" cy="11.4" r="0.85" fill="#FBF8F3" strokeWidth="0" />
            </svg>
          </div>
          SeamFlow
        </div>
        <div style={{ marginTop: 40, fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          Your whole workshop, in one calm place.
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: 'rgba(251,248,243,0.82)' }}>
          Clients · measurements · orders · reminders, for tailors & designers.
        </div>
      </div>
    ),
    { ...size },
  );
}
