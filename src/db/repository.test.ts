import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSpool } from '../test/factories';
import {
  addPrint,
  adjustSpoolRemaining,
  clearAllTables,
  deletePrint,
  deleteSavedColor,
  listSavedColors,
  restoreSavedColor,
  deleteSpool,
  getPrintSummary,
  getSpool,
  getSpoolDetail,
  getSpoolRemaining,
  listPrintSummaries,
  listSpoolsWithRemaining,
  restorePrint,
  restoreSpool,
  setPrintPhoto,
  setSpoolArchived,
  SpoolInUseError,
  updatePrintGrams,
  updateSpool,
} from './repository';
import { db } from './schema';

beforeEach(async () => {
  await clearAllTables();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('spools', () => {
  it('starts with no adjustment and not archived', async () => {
    const spool = await makeSpool();
    expect(spool.adjustmentGrams).toBe(0);
    expect(spool.archived).toBe(false);
    expect(await getSpoolRemaining(spool.id)).toBe(1000);
  });

  it('never stores remaining grams', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Boat', filaments: [{ spoolId: spool.id, slot: 1, grams: 10 }] });
    const stored = await db.spools.get(spool.id);
    expect(stored).not.toHaveProperty('remaining');
  });

  it('updates attributes', async () => {
    const spool = await makeSpool();
    await updateSpool(spool.id, { brand: 'Polymaker' });
    expect((await getSpool(spool.id))?.brand).toBe('Polymaker');
  });

  it('adjusts remaining to a measured weight', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Boat', filaments: [{ spoolId: spool.id, slot: 1, grams: 300 }] });
    await adjustSpoolRemaining(spool.id, 650);
    expect(await getSpoolRemaining(spool.id)).toBe(650);
  });

  it('archives and unarchives', async () => {
    const spool = await makeSpool();
    await setSpoolArchived(spool.id, true);
    expect((await getSpool(spool.id))?.archived).toBe(true);
    await setSpoolArchived(spool.id, false);
    expect((await getSpool(spool.id))?.archived).toBe(false);
  });

  it('blocks deleting a spool while a print refers to it', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Boat', filaments: [{ spoolId: spool.id, slot: 1, grams: 10 }] });
    await expect(deleteSpool(spool.id)).rejects.toBeInstanceOf(SpoolInUseError);
    expect(await getSpool(spool.id)).toBeDefined();
  });

  it('deletes an unused spool and can restore it', async () => {
    const spool = await makeSpool();
    const deleted = await deleteSpool(spool.id);
    expect(await getSpool(spool.id)).toBeUndefined();
    await restoreSpool(deleted);
    expect(await getSpool(spool.id)).toEqual(spool);
  });

  it('lists remaining and used grams together', async () => {
    const a = await makeSpool();
    const b = await makeSpool({ startGrams: 500 });
    await addPrint({
      name: 'Boat',
      filaments: [
        { spoolId: a.id, slot: 1, grams: 100 },
        { spoolId: b.id, slot: 2, grams: 50 },
      ],
    });
    const list = await listSpoolsWithRemaining();
    expect(list.find((s) => s.id === a.id)).toMatchObject({ remaining: 900, used: 100 });
    expect(list.find((s) => s.id === b.id)).toMatchObject({ remaining: 450, used: 50 });
  });

  it('reports usage history newest first', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Old', filaments: [{ spoolId: spool.id, slot: 1, grams: 1 }] });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await addPrint({ name: 'New', filaments: [{ spoolId: spool.id, slot: 1, grams: 2 }] });
    const detail = await getSpoolDetail(spool.id);
    expect(detail?.history.map((h) => h.print.name)).toEqual(['New', 'Old']);
  });
});

describe('saved colors', () => {
  it('can be deleted and restored', async () => {
    await makeSpool({ material: 'PLA', finish: 'Silk', colorName: 'Gold' });
    const [gold] = await listSavedColors('PLA', 'Silk');
    const deleted = await deleteSavedColor(gold!.id);
    expect(await listSavedColors('PLA', 'Silk')).toHaveLength(0);
    await restoreSavedColor(deleted);
    expect(await listSavedColors('PLA', 'Silk')).toEqual([gold]);
  });

  it('remembers a new look when a spool is edited, and renames a matching one', async () => {
    const spool = await makeSpool({ material: 'PLA', finish: 'Silk', colorName: 'Gold' });
    await updateSpool(spool.id, { colorName: 'Old Gold' });
    await updateSpool(spool.id, { shiny: true });
    const names = (await listSavedColors('PLA', 'Silk')).map((c) => [c.name, c.shiny ?? false]);
    expect(names).toEqual([
      ['Old Gold', false],
      ['Old Gold', true],
    ]);
  });
});

describe('remaining grams across a print’s life', () => {
  it('drops when a print is saved', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Boat', filaments: [{ spoolId: spool.id, slot: 1, grams: 120.5 }] });
    expect(await getSpoolRemaining(spool.id)).toBe(879.5);
  });

  it('recalculates when a print is edited', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }],
    });
    const [row] = await db.printFilaments.where('printId').equals(print.id).toArray();
    await updatePrintGrams(print.id, { [row!.id]: 40 });
    expect(await getSpoolRemaining(spool.id)).toBe(960);
  });

  it('comes back when a print is deleted', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }],
    });
    await deletePrint(print.id);
    expect(await getSpoolRemaining(spool.id)).toBe(1000);
    expect(await db.printFilaments.count()).toBe(0);
  });

  it('drops again when a delete is undone', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }],
    });
    const snapshot = await deletePrint(print.id);
    await restorePrint(snapshot);
    expect(await getSpoolRemaining(spool.id)).toBe(900);
    expect((await getPrintSummary(print.id))?.totalGrams).toBe(100);
  });

  it('stops at 0 when overdrawn and recovers when the print goes away', async () => {
    const spool = await makeSpool({ startGrams: 50 });
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 80 }],
    });
    expect(await getSpoolRemaining(spool.id)).toBe(0);
    await deletePrint(print.id);
    expect(await getSpoolRemaining(spool.id)).toBe(50);
  });
});

describe('transactions', () => {
  it('saves nothing if the filament rows fail', async () => {
    const spool = await makeSpool();
    vi.spyOn(db.printFilaments, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'));
    await expect(
      addPrint({ name: 'Boat', filaments: [{ spoolId: spool.id, slot: 1, grams: 10 }] }),
    ).rejects.toThrow('disk full');
    expect(await db.prints.count()).toBe(0);
    expect(await db.printFilaments.count()).toBe(0);
  });

  it('saves nothing if a spool is missing', async () => {
    const spool = await makeSpool();
    await expect(
      addPrint({
        name: 'Boat',
        filaments: [
          { spoolId: spool.id, slot: 1, grams: 10 },
          { spoolId: 'missing', slot: 2, grams: 10 },
        ],
      }),
    ).rejects.toThrow('Spool not found');
    expect(await db.prints.count()).toBe(0);
    expect(await db.printFilaments.count()).toBe(0);
  });

  it('keeps the old grams if an edit fails', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }],
    });
    const [row] = await db.printFilaments.where('printId').equals(print.id).toArray();
    vi.spyOn(db.prints, 'put').mockRejectedValueOnce(new Error('disk full'));
    await expect(updatePrintGrams(print.id, { [row!.id]: 40 })).rejects.toThrow('disk full');
    expect(await getSpoolRemaining(spool.id)).toBe(900);
  });

  it('keeps the print if a delete fails', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }],
    });
    vi.spyOn(db.prints, 'delete').mockRejectedValueOnce(new Error('disk full'));
    await expect(deletePrint(print.id)).rejects.toThrow('disk full');
    expect(await db.printFilaments.count()).toBe(1);
    expect(await getSpoolRemaining(spool.id)).toBe(900);
  });
});

describe('prints', () => {
  it('requires a name, a filament, distinct slots, and valid grams', async () => {
    const spool = await makeSpool();
    const filament = { spoolId: spool.id, slot: 1 as const, grams: 1 };
    await expect(addPrint({ name: '  ', filaments: [filament] })).rejects.toThrow();
    await expect(addPrint({ name: 'A', filaments: [] })).rejects.toThrow();
    await expect(addPrint({ name: 'A', filaments: [filament, filament] })).rejects.toThrow();
    await expect(
      addPrint({ name: 'A', filaments: [{ ...filament, grams: -1 }] }),
    ).rejects.toThrow();
  });

  it('lists newest first with total grams and filaments in slot order', async () => {
    const a = await makeSpool();
    const b = await makeSpool();
    await addPrint({ name: 'Old', filaments: [{ spoolId: a.id, slot: 1, grams: 1 }] });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await addPrint({
      name: 'New',
      filaments: [
        { spoolId: b.id, slot: 3, grams: 2.5 },
        { spoolId: a.id, slot: 1, grams: 3 },
      ],
    });
    const list = await listPrintSummaries();
    expect(list.map((p) => p.print.name)).toEqual(['New', 'Old']);
    expect(list[0]?.totalGrams).toBe(5.5);
    expect(list[0]?.filaments.map((f) => f.slot)).toEqual([1, 3]);
  });

  it('stores photos as raw bytes, not as a Blob, which Safari can lose', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      photo: new Blob(['jpeg'], { type: 'image/jpeg' }),
      filaments: [{ spoolId: spool.id, slot: 1, grams: 1 }],
    });
    const stored = await db.prints.get(print.id);
    expect(stored?.photo).toBeUndefined();
    // Checked by tag: the test environment has more than one ArrayBuffer constructor.
    expect(Object.prototype.toString.call(stored?.photoData)).toBe('[object ArrayBuffer]');
    expect(stored?.photoType).toBe('image/jpeg');
    const summary = await getPrintSummary(print.id);
    expect(summary?.print.photo).toBeInstanceOf(Blob);
    expect(await summary?.print.photo?.text()).toBe('jpeg');
  });

  it('restores a deleted print with its photo', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      photo: new Blob(['jpeg'], { type: 'image/jpeg' }),
      filaments: [{ spoolId: spool.id, slot: 1, grams: 1 }],
    });
    await restorePrint(await deletePrint(print.id));
    expect(await (await getPrintSummary(print.id))?.print.photo?.text()).toBe('jpeg');
  });

  it('stores a photo and clears the pending badge', async () => {
    const spool = await makeSpool();
    const print = await addPrint({
      name: 'Boat',
      photoPending: true,
      filaments: [{ spoolId: spool.id, slot: 1, grams: 1 }],
    });
    await setPrintPhoto(print.id, new Blob(['jpeg'], { type: 'image/jpeg' }));
    const summary = await getPrintSummary(print.id);
    expect(summary?.print.photoPending).toBe(false);
    expect(await summary?.print.photo?.text()).toBe('jpeg');
  });
});
