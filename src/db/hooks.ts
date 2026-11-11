import { useLiveQuery } from 'dexie-react-hooks';
import {
  getPrintSummary,
  getSpoolDetail,
  listPrintSummaries,
  listSpoolsWithRemaining,
} from './repository';

/** Live hooks return `undefined` while loading, and `null` when a record doesn't exist. */
export function useSpools() {
  return useLiveQuery(listSpoolsWithRemaining, []);
}

export function useSpoolDetail(id: string) {
  return useLiveQuery(() => getSpoolDetail(id), [id]);
}

export function usePrints() {
  return useLiveQuery(listPrintSummaries, []);
}

export function usePrint(id: string) {
  return useLiveQuery(() => getPrintSummary(id), [id]);
}
