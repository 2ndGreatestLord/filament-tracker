export const DEFAULT_SPOOL_GRAMS = 1000;

/** Rounds away floating-point noise such as 0.1 + 0.2. Grams keep two decimals at most. */
export function roundGrams(grams: number): number {
  return Math.round(grams * 100) / 100;
}

export function sumGrams(usages: readonly number[]): number {
  return roundGrams(usages.reduce((total, grams) => total + grams, 0));
}

export interface SpoolAmounts {
  startGrams: number;
  adjustmentGrams: number;
  spoolSizeGrams?: number;
}

/** remaining = max(0, startGrams + adjustmentGrams - sum of usage). Never stored. */
export function computeRemaining(spool: SpoolAmounts, usages: readonly number[]): number {
  return Math.max(0, roundGrams(spool.startGrams + spool.adjustmentGrams - sumGrams(usages)));
}

/** The adjustment that makes a spool read `measuredGrams` given what has been used so far. */
export function adjustmentForMeasured(
  spool: Pick<SpoolAmounts, 'startGrams'>,
  usages: readonly number[],
  measuredGrams: number,
): number {
  return roundGrams(measuredGrams - spool.startGrams + sumGrams(usages));
}

/** The weight that counts as a full ring for this spool. */
export function spoolCapacity(spool: SpoolAmounts): number {
  return spool.spoolSizeGrams ?? Math.max(DEFAULT_SPOOL_GRAMS, spool.startGrams);
}

/** Fraction of the ring to fill, from 0 to 1. */
export function fractionRemaining(remaining: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(1, Math.max(0, remaining / capacity));
}

/** What a spool will hold after a print uses `grams`. Stops at 0. */
export function remainingAfter(remaining: number, grams: number): number {
  return Math.max(0, roundGrams(remaining - grams));
}

export function formatGrams(grams: number): string {
  return `${roundGrams(grams).toLocaleString('en-US')} g`;
}
