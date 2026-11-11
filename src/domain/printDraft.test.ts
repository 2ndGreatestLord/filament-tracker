import { describe, expect, it } from 'vitest';
import {
  assignSlot,
  canLeaveSlots,
  clearSlot,
  draftFilaments,
  EMPTY_DRAFT,
  filledSlots,
  setSlotGrams,
} from './printDraft';

describe('print draft', () => {
  it('needs a name and at least one slot to continue', () => {
    expect(canLeaveSlots(EMPTY_DRAFT)).toBe(false);
    expect(canLeaveSlots({ ...EMPTY_DRAFT, name: 'Boat' })).toBe(false);
    expect(canLeaveSlots(assignSlot(EMPTY_DRAFT, 1, 'a'))).toBe(false);
    expect(canLeaveSlots({ ...assignSlot(EMPTY_DRAFT, 1, 'a'), name: '  ' })).toBe(false);
    expect(canLeaveSlots({ ...assignSlot(EMPTY_DRAFT, 3, 'a'), name: 'Boat' })).toBe(true);
  });

  it('lists filled slots in order, even with gaps', () => {
    const draft = assignSlot(assignSlot(EMPTY_DRAFT, 4, 'b'), 2, 'a');
    expect(filledSlots(draft)).toEqual([2, 4]);
  });

  it('clearing a slot drops its grams', () => {
    const draft = setSlotGrams(assignSlot(EMPTY_DRAFT, 1, 'a'), 1, 25);
    const cleared = clearSlot(draft, 1);
    expect(filledSlots(cleared)).toEqual([]);
    expect(cleared.grams[1]).toBeUndefined();
  });

  it('swapping a slot’s spool resets its grams, but re-picking the same keeps them', () => {
    const draft = setSlotGrams(assignSlot(EMPTY_DRAFT, 1, 'a'), 1, 25);
    expect(assignSlot(draft, 1, 'a').grams[1]).toBe(25);
    expect(assignSlot(draft, 1, 'b').grams[1]).toBe(0);
  });

  it('produces the rows to save', () => {
    const draft = setSlotGrams(assignSlot(assignSlot(EMPTY_DRAFT, 1, 'a'), 3, 'b'), 3, 12.5);
    expect(draftFilaments(draft)).toEqual([
      { spoolId: 'a', slot: 1, grams: 0 },
      { spoolId: 'b', slot: 3, grams: 12.5 },
    ]);
  });
});
