// Which responses may be cached by a shared cache, and — more importantly —
// which may not.
//
// The feed, the storefronts and the catalogue are identical for everyone and
// were being rebuilt from scratch for each visitor. The token-addressed routes
// are the opposite: /public/orders/:token and /public/invoices/:token show one
// client's order to whoever holds the link, and `Cache-Control: public` on
// those would let a shared cache serve that page to the next caller.

import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import { PUBLIC_CACHE } from './cache';
import { FeedController } from '../feed/feed.controller';
import { PublicCatalogueController } from '../public/public-catalogue.controller';
import { PublicOrdersController } from '../public/public-orders.controller';
import { PublicInvoicesController } from '../invoices/public-invoices.controller';

type HeaderMeta = { name: string; value: string };

/** The @Header() decorators Nest recorded for one handler. */
function headersOn(ctor: new (...args: never[]) => object, method: string): HeaderMeta[] {
  const handler = (ctor.prototype as Record<string, unknown>)[method];
  return (Reflect.getMetadata(HEADERS_METADATA, handler as object) ?? []) as HeaderMeta[];
}

function cacheControlOn(ctor: new (...args: never[]) => object, method: string): string | null {
  const found = headersOn(ctor, method).find(
    (h) => h.name.toLowerCase() === 'cache-control',
  );
  return found?.value ?? null;
}

describe('the cacheable public surface', () => {
  const shared: [string, new (...args: never[]) => object, string][] = [
    ['the discover feed', FeedController, 'list'],
    ['one design', FeedController, 'get'],
    ['a storefront by slug', FeedController, 'storefrontBySlug'],
    ['a storefront by id', FeedController, 'storefront'],
    ['a catalogue by slug', PublicCatalogueController, 'catalogue'],
  ];

  it.each(shared)('%s is cacheable', (_label, ctor, method) => {
    expect(cacheControlOn(ctor, method)).toBe(PUBLIC_CACHE);
  });

  it('allows a shared cache, which is the point', () => {
    // `public` is what lets Cloudflare answer instead of the origin. `private`
    // would still help one browser and nothing else.
    expect(PUBLIC_CACHE).toMatch(/\bpublic\b/);
    expect(PUBLIC_CACHE).toMatch(/max-age=\d+/);
  });

  it('keeps the window short enough that a tailor sees their own work appear', () => {
    const maxAge = Number(/max-age=(\d+)/.exec(PUBLIC_CACHE)?.[1]);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(300);
  });
});

describe('the token-addressed routes', () => {
  // These are the ones where a shared cache would be a data leak.
  const secret: [string, new (...args: never[]) => object, string][] = [
    ['a shared order', PublicOrdersController, 'getByToken'],
    ['a shared invoice', PublicInvoicesController, 'getByToken'],
  ];

  it.each(secret)('%s is never given a Cache-Control header', (_label, ctor, method) => {
    expect(cacheControlOn(ctor, method)).toBeNull();
  });

  it.each(secret)('%s carries no public caching hint of any kind', (_label, ctor, method) => {
    const values = headersOn(ctor, method).map((h) => `${h.name}: ${h.value}`.toLowerCase());
    expect(values.filter((v) => v.includes('public'))).toEqual([]);
  });
});
