// A dollar price may carry cents; a franc price may not, and neither may carry
// more precision than a card can charge.
import { describe, expect, it } from 'vitest';
import { PriceTableSchema, defaultPrices } from './subscription';

const withUsd = (usd: Partial<Record<'monthly' | 'quarterly' | 'annual', number>>) => ({
  ...defaultPrices(),
  USD: { ...defaultPrices().USD, ...usd },
});

describe('PriceTableSchema — dollar prices', () => {
  it('accepts whole dollars and cents', () => {
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 5 })).success).toBe(true);
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 4.99 })).success).toBe(true);
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 0.5 })).success).toBe(true);
    expect(PriceTableSchema.safeParse(withUsd({ annual: 44.5 })).success).toBe(true);
  });

  it('refuses a third decimal rather than rounding it silently', () => {
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 4.999 })).success).toBe(false);
  });

  it('keeps the floor and the ceiling', () => {
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 0.1 })).success).toBe(false);
    expect(PriceTableSchema.safeParse(withUsd({ monthly: 10_001 })).success).toBe(false);
  });

  it('leaves franc prices as whole numbers', () => {
    const t = defaultPrices();
    expect(PriceTableSchema.safeParse({ ...t, XAF: { ...t.XAF, monthly: 1000.5 } }).success).toBe(false);
  });

  it('still accepts the prices compiled into the build', () => {
    expect(PriceTableSchema.safeParse(defaultPrices()).success).toBe(true);
  });
});
