import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeSpool } from '../test/factories';
import { migrateLegacyPhotos } from './migrations';
import { clearAllTables, getPrintSummary, listSavedColors } from './repository';
import { db, FilamentDb, type StoredPrint } from './schema';

beforeEach(async () => {
  await clearAllTables();
});

const bytes = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);

function legacyPrint(id: string, photo: Blob): StoredPrint {
  return {
    id,
    name: 'Old print',
    photo,
    photoPending: false,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  };
}

describe('migrateLegacyPhotos', () => {
  it('moves a version 1 Blob photo into bytes that still display', async () => {
    await db.prints.put(legacyPrint('p1', new Blob([bytes], { type: 'image/jpeg' })));

    expect(await migrateLegacyPhotos()).toBe(1);

    const stored = await db.prints.get('p1');
    expect(stored?.photo).toBeUndefined();
    expect(new Uint8Array(stored!.photoData!)).toEqual(bytes);
    expect(stored?.photoType).toBe('image/jpeg');
    const summary = await getPrintSummary('p1');
    expect(new Uint8Array(await summary!.print.photo!.arrayBuffer())).toEqual(bytes);
  });

  it('marks the print "Photo needed" when the old photo can no longer be read', async () => {
    const broken = new Blob([bytes], { type: 'image/jpeg' });
    await db.prints.put(legacyPrint('p2', broken));
    const stored = await db.prints.get('p2');
    // Simulate Safari losing the Blob's contents.
    Object.defineProperty(stored!.photo!, 'arrayBuffer', {
      value: () => Promise.reject(new Error('WebKitBlobResource error 1')),
    });
    const original = db.prints.toArray.bind(db.prints);
    db.prints.toArray = (() => Promise.resolve([stored!])) as typeof db.prints.toArray;
    try {
      await migrateLegacyPhotos();
    } finally {
      db.prints.toArray = original;
    }

    const after = await db.prints.get('p2');
    expect(after?.photo).toBeUndefined();
    expect(after?.photoData).toBeUndefined();
    expect(after?.photoPending).toBe(true);
  });

  it('does nothing when there are no old photos', async () => {
    expect(await migrateLegacyPhotos()).toBe(0);
  });
});

describe('upgrading from schema version 1', () => {
  it('builds a palette per material and finish from existing spools', async () => {
    const name = 'upgrade-test';
    await Dexie.delete(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({
      spools: 'id, createdAt',
      prints: 'id, createdAt',
      printFilaments: 'id, printId, spoolId',
    });
    const spool = (id: string, material: string, finish: string, colorHex: string) => ({
      id,
      material,
      finish,
      colorHex,
      colorName: 'Mine',
      startGrams: 1000,
      adjustmentGrams: 0,
      archived: false,
      createdAt: id,
      updatedAt: id,
    });
    await v1.table('spools').bulkAdd([
      spool('1', 'PLA', 'Matte', '#111111'),
      spool('2', 'PLA', 'Matte', '#111111'),
      spool('3', 'PLA', 'Basic', '#111111'),
    ]);
    v1.close();

    const upgraded = new FilamentDb(name);
    const colors = await upgraded.colors.toArray();
    expect(colors.map((c) => `${c.material} ${c.finish} ${c.colorHex}`).sort()).toEqual([
      'PLA Basic #111111',
      'PLA Matte #111111',
    ]);
    expect(await upgraded.spools.count()).toBe(3);
    upgraded.close();
    await Dexie.delete(name);
  });
});

describe('saving spools remembers their colors', () => {
  it('adds each new look to its material and finish palette, once', async () => {
    await makeSpool({ material: 'PLA', finish: 'Matte', colorHex: '#123456', colorName: 'Deep' });
    await makeSpool({ material: 'PLA', finish: 'Matte', colorHex: '#123456', colorName: 'Deep' });
    await makeSpool({ material: 'PLA', finish: 'Basic', colorHex: '#123456' });
    await makeSpool({
      material: 'PLA',
      finish: 'Matte',
      colorHex: '#ff0000',
      colorStops: ['#ff0000', '#0000ff'],
      shiny: true,
      colorName: 'Sunset',
    });

    const matte = await listSavedColors('PLA', 'Matte');
    expect(matte.map((c) => c.name)).toEqual(['Deep', 'Sunset']);
    expect(matte[1]).toMatchObject({ colorStops: ['#ff0000', '#0000ff'], shiny: true });
    expect(await listSavedColors('PLA', 'Basic')).toHaveLength(1);
    expect(await listSavedColors('PETG', 'Basic')).toHaveLength(0);
  });
});
