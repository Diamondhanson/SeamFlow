import { ImageResponse } from 'next/og';
import { loadCatalogue } from '../../../lib/catalogue-data';

export const alt = 'Tailor catalogue on SeamFlow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The card WhatsApp draws when this link is pasted into a chat.
 *
 * This is the highest-leverage thing on the whole feature. The primary sharing
 * channel is WhatsApp, and a link with no preview reads as spam — the
 * difference between a customer tapping and not tapping is mostly decided
 * before they ever reach the page.
 *
 * So the card shows the tailor's actual work, not our logo: a strip of their
 * photographs with their name over it. Generated per-slug at request time and
 * cached by the CDN alongside the page.
 *
 * Uses ImageResponse's built-in font deliberately — fetching a webfont here
 * would add a network hop that can fail, and a card that fails to render is
 * worse than one set in the default face.
 */
export default async function CatalogueOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const payload = await loadCatalogue(slug).catch(() => null);

  // Unknown slug, or the API is down. Fall back to a plain branded card rather
  // than letting the route throw — a 500 here strips the preview off a link
  // that may still work perfectly well.
  if (!payload) return brandedFallback();

  const { tailor, posts } = payload;
  const tiles = posts.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#FBF8F3',
          color: '#1A1714',
        }}
      >
        {/* Left: who. Right: what they make. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px',
            width: tiles.length ? '54%' : '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#5B554F',
            }}
          >
            Catalogue
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 18,
              fontSize: tailor.businessName.length > 22 ? 54 : 68,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {tailor.businessName}
          </div>
          {tailor.city ? (
            <div style={{ display: 'flex', marginTop: 16, fontSize: 28, color: '#5B554F' }}>
              {tailor.city}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              marginTop: 34,
              alignItems: 'center',
              gap: 12,
              fontSize: 22,
              color: '#5B554F',
            }}
          >
            <div style={{ display: 'flex', width: 40, height: 3, background: '#C97B5C' }} />
            {posts.length > 0
              ? `${posts.length} ${posts.length === 1 ? 'piece' : 'pieces'}`
              : 'SeamFlow'}
          </div>
        </div>

        {tiles.length ? (
          <div style={{ display: 'flex', width: '46%', height: '100%' }}>
            {tiles.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  width: `${100 / tiles.length}%`,
                  height: '100%',
                  borderLeft: i === 0 ? '1px solid rgba(26,23,20,0.10)' : 'none',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}

function brandedFallback() {
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
          background: 'linear-gradient(135deg, #C45BFF 0%, #7B30E8 55%, #5A18C9 100%)',
          color: '#FBF8F3',
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>SeamFlow</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 56, fontWeight: 700 }}>
          Tailor catalogues.
        </div>
      </div>
    ),
    { ...size },
  );
}
