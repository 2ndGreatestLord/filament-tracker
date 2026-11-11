import type { Slot } from './types';

export const SLOTS: readonly Slot[] = [1, 2, 3, 4];

export interface PrintDraft {
  name: string;
  /** Spool id per slot. */
  spools: Partial<Record<Slot, string>>;
  grams: Partial<Record<Slot, number>>;
  photo?: Blob;
}

export const EMPTY_DRAFT: PrintDraft = { name: '', spools: {}, grams: {} };

export function filledSlots(draft: PrintDraft): Slot[] {
  return SLOTS.filter((slot) => draft.spools[slot] !== undefined);
}

/** Next is enabled once there's a name and at least one filled slot. */
export function canLeaveSlots(draft: PrintDraft): boolean {
  return draft.name.trim() !== '' && filledSlots(draft).length > 0;
}

export function assignSlot(draft: PrintDraft, slot: Slot, spoolId: string): PrintDraft {
  const unchanged = draft.spools[slot] === spoolId;
  return {
    ...draft,
    spools: { ...draft.spools, [slot]: spoolId },
    grams: unchanged ? draft.grams : { ...draft.grams, [slot]: 0 },
  };
}

export function clearSlot(draft: PrintDraft, slot: Slot): PrintDraft {
  const spools = { ...draft.spools };
  const grams = { ...draft.grams };
  delete spools[slot];
  delete grams[slot];
  return { ...draft, spools, grams };
}

export function setSlotGrams(draft: PrintDraft, slot: Slot, grams: number): PrintDraft {
  return { ...draft, grams: { ...draft.grams, [slot]: grams } };
}

export function draftFilaments(
  draft: PrintDraft,
): { spoolId: string; slot: Slot; grams: number }[] {
  return filledSlots(draft).map((slot) => ({
    spoolId: draft.spools[slot] as string,
    slot,
    grams: draft.grams[slot] ?? 0,
  }));
}
