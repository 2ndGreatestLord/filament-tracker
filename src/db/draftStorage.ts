import type { PrintDraft } from '../domain/printDraft';

const KEY = 'filament-tracker.printDraft';

/**
 * Keeps the Add Print draft across a page reload, because phones can discard the page
 * while the camera is open. The photo is left out, since a Blob can't go in text storage.
 */
export function saveDraft({ name, spools, grams }: PrintDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ name, spools, grams }));
  } catch {
    // Storage can be unavailable. The draft then lives only in memory.
  }
}

export function loadDraft(): PrintDraft | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored === null) return null;
    const draft = JSON.parse(stored) as Partial<PrintDraft> | null;
    if (typeof draft?.name !== 'string' || !draft.spools || !draft.grams) return null;
    return { name: draft.name, spools: draft.spools, grams: draft.grams };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored, so nothing to clear.
  }
}
