// Money. Every case here is either a currency this product actually bills in,
// a keyboard a tailor actually types on, or a float-rounding shape that would
// put a different number on the invoice than in the database.

import { amount, balanceOf, lineTotal, roundMoney, subtotalOf } from './invoice-math';

describe('amount', () => {
  it('reads a plain number', () => {
    expect(amount('1500')).toBe(1500);
  });

  it('reads the comma decimal a French Android keyboard produces', () => {
    // The decimal key on a French keyboard is a comma. Number('2,5') is NaN.
    expect(amount('2,5')).toBe(2.5);
  });

  it('ignores the spaces used as thousands separators, including NBSP', () => {
    expect(amount('1 500')).toBe(1500);
    expect(amount('1 500')).toBe(1500);
  });

  it('treats blank and garbage as zero so a line never becomes NaN', () => {
    expect(amount('')).toBe(0);
    expect(amount(null)).toBe(0);
    expect(amount(undefined)).toBe(0);
    expect(amount('abc')).toBe(0);
  });
});

describe('roundMoney', () => {
  it('keeps 2 decimals when no currency is given', () => {
    expect(roundMoney(10.005)).toBe(10.01);
  });

  it('gives XAF no minor unit at all', () => {
    // This product's home currency has no centimes. Rounding to 2dp stored
    // 999.90 and printed "FCFA 1,000" — a bill whose stored figure was not
    // the figure on the paper.
    expect(roundMoney(999.9, 'XAF')).toBe(1000);
    expect(roundMoney(1500.4, 'XAF')).toBe(1500);
  });

  it('gives USD two', () => {
    expect(roundMoney(19.994, 'USD')).toBe(19.99);
  });

  it('kills binary-float noise', () => {
    // 1.1 * 1.1 is 1.2100000000000002 in binary floating point.
    expect(roundMoney(1.1 * 1.1)).toBe(1.21);
  });

  it('turns a non-finite amount into zero rather than NaN on the invoice', () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
  });
});

describe('lineTotal', () => {
  it('multiplies quantity by price', () => {
    expect(lineTotal('3', '2500', 'XAF')).toBe(7500);
  });

  it('handles a fractional quantity typed with a comma', () => {
    expect(lineTotal('2,5', '1000', 'XAF')).toBe(2500);
  });

  it('clamps a negative quantity to zero instead of subtracting from the bill', () => {
    // A negative line is always a typo; a credit belongs in the deposit field.
    expect(lineTotal('-3', '2500', 'XAF')).toBe(0);
  });

  it('clamps a negative price to zero', () => {
    expect(lineTotal('3', '-2500', 'XAF')).toBe(0);
  });

  it('is zero when either side is empty', () => {
    expect(lineTotal('', '2500', 'XAF')).toBe(0);
    expect(lineTotal('3', '', 'XAF')).toBe(0);
  });
});

describe('subtotalOf', () => {
  it('adds the lines up', () => {
    const lines = [
      { qty: '2', price: '5000' },
      { qty: '1', price: '12000' },
    ];
    expect(subtotalOf(lines, 'XAF')).toBe(22000);
  });

  it('is zero for an invoice with no lines', () => {
    expect(subtotalOf([], 'XAF')).toBe(0);
  });

  it('agrees with the sum of the line totals the rows render', () => {
    // The bug this module exists for: the row rendered one expression and the
    // useMemo computed another, so the column stopped adding up. Whatever
    // else changes, these two must stay equal.
    const lines = [
      { qty: '1,1', price: '1,1' },
      { qty: '3', price: '0,33' },
      { qty: '7', price: '99,99' },
    ];
    const rendered = lines.reduce((s, l) => s + lineTotal(l.qty, l.price, 'USD'), 0);
    expect(subtotalOf(lines, 'USD')).toBe(roundMoney(rendered, 'USD'));
  });

  it('rounds each line to the currency before adding, so the column adds up', () => {
    // 333.33 + 333.33 is 666.66, which would round to 667 if the subtotal were
    // computed from the raw prices. It is 666, because each LINE is rounded to
    // XAF first (333 + 333) — and 333 is the figure the row actually shows.
    // A subtotal that disagrees with the visible column is the bug this module
    // was written to kill, so the double rounding is the point, not an error.
    const lines = [
      { qty: '1', price: '333,33' },
      { qty: '1', price: '333,33' },
    ];
    expect(subtotalOf(lines, 'XAF')).toBe(666);
    expect(lineTotal('1', '333,33', 'XAF')).toBe(333);
  });
});

describe('balanceOf', () => {
  it('subtracts the deposit', () => {
    expect(balanceOf(20000, '5000', 'XAF')).toBe(15000);
  });

  it('is zero when the deposit covers the bill', () => {
    expect(balanceOf(20000, '20000', 'XAF')).toBe(0);
  });

  it('goes negative when the client has overpaid', () => {
    // Deliberate: an over-payment is real information, not something to clamp
    // away. The screen decides how to word it.
    expect(balanceOf(20000, '25000', 'XAF')).toBe(-5000);
  });

  it('ignores a negative deposit rather than inflating the balance', () => {
    expect(balanceOf(20000, '-5000', 'XAF')).toBe(20000);
  });

  it('treats an empty deposit field as nothing paid', () => {
    expect(balanceOf(20000, '', 'XAF')).toBe(20000);
  });
});
