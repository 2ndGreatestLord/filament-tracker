export const DEFAULT_LOW_STOCK_THRESHOLD = 100;

export type StockStatus = 'ok' | 'low' | 'empty';

/** Amber below the threshold, red at 0 g. */
export function getStockStatus(remaining: number, threshold: number): StockStatus {
  if (remaining <= 0) return 'empty';
  if (remaining < threshold) return 'low';
  return 'ok';
}

/** Words shown next to the colour so status is never colour alone. */
export function stockLabel(status: StockStatus): string | undefined {
  if (status === 'low') return 'Low';
  if (status === 'empty') return 'Empty';
  return undefined;
}
