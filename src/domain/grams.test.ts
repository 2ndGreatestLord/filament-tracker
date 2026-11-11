import { describe, expect, it } from 'vitest';
import {
  adjustmentForMeasured,
  computeRemaining,
  formatGrams,
  fractionRemaining,
  remainingAfter,
  spoolCapacity,
  sumGrams,
} from './grams';

describe('computeRemaining', () => {
  it('is the start weight when nothing has been used', () => {
    expect(computeRemaining({ startGrams: 1000, adjustmentGrams: 0 }, [])).toBe(1000);
  });

  it('subtracts every usage', () => {
    expect(computeRemaining({ startGrams: 1000, adjustmentGrams: 0 }, [100, 50.5])).toBe(849.5);
  });

  it('applies a positive or negative adjustment', () => {
    expect(computeRemaining({ startGrams: 1000, adjustmentGrams: -25 }, [100])).toBe(875);
    expect(computeRemaining({ startGrams: 1000, adjustmentGrams: 40 }, [100])).toBe(940);
  });

  it('stops at 0 when more was used than the spool held', () => {
    expect(computeRemaining({ startGrams: 100, adjustmentGrams: 0 }, [150])).toBe(0);
  });

  it('has no floating-point noise', () => {
    expect(computeRemaining({ startGrams: 0.3, adjustmentGrams: 0 }, [0.1])).toBe(0.2);
    expect(sumGrams([0.1, 0.2])).toBe(0.3);
  });
});

describe('adjustmentForMeasured', () => {
  it('makes the spool read the measured weight', () => {
    const spool = { startGrams: 1000, adjustmentGrams: 0 };
    const usages = [200, 100];
    const adjustmentGrams = adjustmentForMeasured(spool, usages, 650);
    expect(adjustmentGrams).toBe(-50);
    expect(computeRemaining({ ...spool, adjustmentGrams }, usages)).toBe(650);
  });

  it('works when usage has overdrawn the spool', () => {
    const spool = { startGrams: 100, adjustmentGrams: 0 };
    const adjustmentGrams = adjustmentForMeasured(spool, [150], 20);
    expect(computeRemaining({ ...spool, adjustmentGrams }, [150])).toBe(20);
  });
});

describe('capacity and fraction', () => {
  it('uses the spool size when given', () => {
    expect(spoolCapacity({ startGrams: 300, adjustmentGrams: 0, spoolSizeGrams: 750 })).toBe(750);
  });

  it('defaults to 1,000 g', () => {
    expect(spoolCapacity({ startGrams: 300, adjustmentGrams: 0 })).toBe(1000);
  });

  it('grows to fit a larger starting weight', () => {
    expect(spoolCapacity({ startGrams: 2500, adjustmentGrams: 0 })).toBe(2500);
  });

  it('clamps the fraction between 0 and 1', () => {
    expect(fractionRemaining(500, 1000)).toBe(0.5);
    expect(fractionRemaining(1500, 1000)).toBe(1);
    expect(fractionRemaining(0, 1000)).toBe(0);
    expect(fractionRemaining(10, 0)).toBe(0);
  });
});

describe('remainingAfter and formatGrams', () => {
  it('previews what will be left and stops at 0', () => {
    expect(remainingAfter(412, 35)).toBe(377);
    expect(remainingAfter(10, 35)).toBe(0);
  });

  it('formats with a unit and thousands separator', () => {
    expect(formatGrams(1000)).toBe('1,000 g');
    expect(formatGrams(12.5)).toBe('12.5 g');
  });
});
