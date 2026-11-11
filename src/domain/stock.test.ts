import { describe, expect, it } from 'vitest';
import { getStockStatus, stockLabel } from './stock';

describe('getStockStatus', () => {
  it('is ok at or above the threshold', () => {
    expect(getStockStatus(100, 100)).toBe('ok');
    expect(getStockStatus(800, 100)).toBe('ok');
  });

  it('is low just below the threshold', () => {
    expect(getStockStatus(99.9, 100)).toBe('low');
    expect(getStockStatus(1, 100)).toBe('low');
  });

  it('is empty at 0 g', () => {
    expect(getStockStatus(0, 100)).toBe('empty');
  });

  it('respects a custom threshold', () => {
    expect(getStockStatus(150, 200)).toBe('low');
    expect(getStockStatus(150, 50)).toBe('ok');
  });

  it('is still empty with a threshold of 0', () => {
    expect(getStockStatus(0, 0)).toBe('empty');
  });
});

describe('stockLabel', () => {
  it('names low and empty in words', () => {
    expect(stockLabel('low')).toBe('Low');
    expect(stockLabel('empty')).toBe('Empty');
    expect(stockLabel('ok')).toBeUndefined();
  });
});
