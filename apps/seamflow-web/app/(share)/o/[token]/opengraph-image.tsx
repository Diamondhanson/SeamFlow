import { ImageResponse } from 'next/og';
import { publicApi } from '../../../../lib/api';

export const alt = 'Your order on SeamFlow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The card WhatsApp draws when an order link is pasted into a chat.
 *
 * It names the shop and the order and nothing else — no photos, no notes, no
 * price, no status. Chat apps keep a copy of this picture and anyone the link is
 * forwarded to sees it, so it carries only what the link already tells a person
 * who has it: whose order this is. (The status is left out for a second reason:
 * it changes, and a cached card would go on saying "In progress" after delivery.)
 */
export default async function OrderOgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await publicApi().shareLinks.resolvePublic(token).catch(() => null);
  if (!payload) return fallback();

  const shop = payload.tailor.businessName;
  const name = payload.order.orderName;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #C45BFF 0%, #7B30E8 55%, #5A18C9 100%)',
          color: '#FBF8F3',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 700 }}>
          SeamFlow
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              letterSpacing: 4,
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            Your order
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 18,
              fontSize: name.length > 28 ? 62 : 82,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 36, opacity: 0.92 }}>
            {`from ${shop}`}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, opacity: 0.85 }}>
          Track your order on SeamFlow
        </div>
      </div>
    ),
    { ...size },
  );
}

function fallback() {
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
          Your order, tracked.
        </div>
      </div>
    ),
    { ...size },
  );
}
