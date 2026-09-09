'use client';

import { useEffect, useRef, useState } from 'react';

type Aud = 'tailor' | 'customer';

/**
 * The "For tailors ⇄ For customers" switch. Sets `data-aud` on <html>, which
 * reskins the marketing accent (purple → rose via CSS variables) and reveals the
 * matching copy (.t-only / .c-only). Tailor is the default. The choice persists
 * on-device so a returning visitor lands on the side they last chose.
 */
export function AudienceToggle({
  tailorLabel,
  customerLabel,
  className = '',
}: {
  tailorLabel: string;
  customerLabel: string;
  className?: string;
}) {
  const [aud, setAud] = useState<Aud>('tailor');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number }>({ left: 4, width: 0 });

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('seamflow.aud');
    } catch {
      /* private mode — fall back to default */
    }
    const v: Aud = saved === 'customer' ? 'customer' : 'tailor';
    setAud(v);
    document.documentElement.dataset.aud = v;
  }, []);

  const choose = (v: Aud) => {
    setAud(v);
    document.documentElement.dataset.aud = v;
    try {
      localStorage.setItem('seamflow.aud', v);
    } catch {
      /* ignore */
    }
  };

  // Slide + resize the thumb to the active button.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLButtonElement>(`button[data-v="${aud}"]`);
    if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, [aud, tailorLabel, customerLabel]);

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label="Choose audience"
      className={`relative inline-flex rounded-full border border-brand-border bg-brand-surface p-1 ${className}`}
    >
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-full bg-gradient-to-b from-accentLight to-accent shadow-glow"
        style={{
          left: thumb.left,
          width: thumb.width,
          transition: 'left .42s cubic-bezier(.34,1.4,.5,1), width .42s cubic-bezier(.34,1.4,.5,1), background .5s ease',
        }}
      />
      {(['tailor', 'customer'] as const).map((v) => (
        <button
          key={v}
          data-v={v}
          type="button"
          aria-pressed={aud === v}
          onClick={() => choose(v)}
          className={`relative z-10 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-300 ${
            aud === v ? 'text-white' : 'text-brand-muted hover:text-brand-ink'
          }`}
        >
          {v === 'tailor' ? tailorLabel : customerLabel}
        </button>
      ))}
    </div>
  );
}
