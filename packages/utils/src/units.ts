export type LengthUnit = 'cm' | 'in';

const CM_PER_INCH = 2.54;

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function formatLength(value: number, unit: LengthUnit, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)} ${unit}`;
}
