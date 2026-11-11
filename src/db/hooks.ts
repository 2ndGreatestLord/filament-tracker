import { useLiveQuery } from 'dexie-react-hooks';
import {
  getPrintSummary,
  getSpoolDetail,
  listPrintSummaries,
  listSavedColors,
  listSpoolsWithRemaining,
} from './repository';

/** Saved colors for a material and finish. Empty until both are chosen. */
export function useSavedColors(material: string, finish: string) {
  return useLiveQuery(
    () => (material && finish ? listSavedColors(material, finish) : Promise.resolve([])),
    [material, finish],
  );
}

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
