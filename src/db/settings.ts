import { useSyncExternalStore } from 'react';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../domain/stock';

const THRESHOLD_KEY = 'filament-tracker.lowStockThreshold';
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getLowStockThreshold(): number {
  try {
    const stored = localStorage.getItem(THRESHOLD_KEY);
    if (stored === null) return DEFAULT_LOW_STOCK_THRESHOLD;
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_LOW_STOCK_THRESHOLD;
  } catch {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
}

export function setLowStockThreshold(grams: number): void {
  try {
    localStorage.setItem(THRESHOLD_KEY, String(grams));
  } catch {
    // Storage can be unavailable in private browsing. The default stays in effect.
  }
  notify();
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(THRESHOLD_KEY);
  } catch {
    // Nothing stored, so nothing to reset.
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLowStockThreshold(): number {
  return useSyncExternalStore(subscribe, getLowStockThreshold);
}
