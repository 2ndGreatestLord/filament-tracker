import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSpool } from '../test/factories';
import {
  BackupError,
  createBackup,
  eraseAllData,
  exportBackupText,
  importBackupText,
  parseBackup,
} from './backup';
import {
  addPrint,
  adjustSpoolRemaining,
  getSpoolRemaining,
  listPrintSummaries,
  setSpoolArchived,
} from './repository';
import { db, SCHEMA_VERSION } from './schema';
import { getLowStockThreshold, setLowStockThreshold } from './settings';

beforeEach(async () => {
  await eraseAllData();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const photoBytes = new Uint8Array([0xff, 0xd8, 0x00, 0x7f, 0x80, 0xff, 0xd9]);

async function seed() {
  const a = await makeSpool({ brand: 'Acme', price: 19.5, spoolSizeGrams: 750, startGrams: 750 });
  const b = await makeSpool({ material: 'PETG', colorName: undefined });
  await setSpoolArchived(b.id, true);
  await addPrint({
    name: 'With photo',
    photo: new Blob([photoBytes], { type: 'image/jpeg' }),
    filaments: [
      { spoolId: a.id, slot: 1, grams: 100.5 },
      { spoolId: b.id, slot: 3, grams: 25 },
    ],
  });
  await addPrint({
    name: 'Needs photo',
    photoPending: true,
    filaments: [{ spoolId: a.id, slot: 2, grams: 10 }],
  });
  await adjustSpoolRemaining(b.id, 800);
  setLowStockThreshold(150);
  return { a, b };
}

async function dumpTables() {
  const prints = await db.prints.orderBy('id').toArray();
  return {
    spools: await db.spools.orderBy('id').toArray(),
    printFilaments: await db.printFilaments.orderBy('id').toArray(),
    prints: await Promise.all(
      prints.map(async ({ photo, ...print }) => ({
        ...print,
        photoBytes: photo ? Array.from(new Uint8Array(await photo.arrayBuffer())) : undefined,
        photoType: photo?.type,
      })),
    ),
  };
}

describe('backup round trip', () => {
  it('reproduces the same data in an empty database, photos included', async () => {
    const { a, b } = await seed();
    const before = await dumpTables();
    const remainingA = await getSpoolRemaining(a.id);
    const remainingB = await getSpoolRemaining(b.id);
    const text = await exportBackupText();

    await eraseAllData();
    expect(await db.spools.count()).toBe(0);
    expect(await db.prints.count()).toBe(0);
    expect(await db.printFilaments.count()).toBe(0);
    expect(getLowStockThreshold()).toBe(100);

    await importBackupText(text);

    expect(await dumpTables()).toEqual(before);
    expect(await getSpoolRemaining(a.id)).toBe(remainingA);
    expect(await getSpoolRemaining(b.id)).toBe(remainingB);
    expect(getLowStockThreshold()).toBe(150);
    const summaries = await listPrintSummaries();
    const withPhoto = summaries.find((s) => s.print.name === 'With photo');
    expect(withPhoto?.print.photo?.type).toBe('image/jpeg');
    expect(new Uint8Array(await withPhoto!.print.photo!.arrayBuffer())).toEqual(photoBytes);
  });

  it('carries a schema version and base64 photos', async () => {
    await seed();
    const backup = await createBackup();
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    const withPhoto = backup.prints.find((print) => print.name === 'With photo');
    expect(withPhoto?.photo).toBe(btoa(String.fromCharCode(...photoBytes)));
  });

  it('replaces whatever was there before', async () => {
    await seed();
    const text = await exportBackupText();
    await eraseAllData();
    await makeSpool({ material: 'Replaced' });
    await importBackupText(text);
    const materials = (await db.spools.toArray()).map((spool) => spool.material);
    expect(materials).not.toContain('Replaced');
  });
});

describe('import safety', () => {
  async function validBackup() {
    await seed();
    return JSON.parse(await exportBackupText()) as Record<string, unknown>;
  }

  it('rejects text that isn’t JSON', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
  });

  it('rejects other JSON files', () => {
    expect(() => parseBackup('{"hello":"world"}')).toThrow(BackupError);
  });

  it('rejects a newer schema version', async () => {
    const backup = await validBackup();
    backup.schemaVersion = SCHEMA_VERSION + 1;
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('newer version');
  });

  it('rejects malformed rows', async () => {
    const backup = await validBackup();
    backup.spools = [{ id: 'x' }];
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError);
  });

  it('rejects rows pointing at missing spools', async () => {
    const backup = await validBackup();
    backup.spools = [];
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError);
  });

  it('keeps existing data when the file is bad', async () => {
    await seed();
    const before = await dumpTables();
    await expect(importBackupText('nope')).rejects.toBeInstanceOf(BackupError);
    expect(await dumpTables()).toEqual(before);
  });

  it('keeps existing data when a photo is damaged', async () => {
    const backup = await validBackup();
    const before = await dumpTables();
    (backup.prints as { photo?: string }[]).forEach((print) => {
      if (print.photo) print.photo = '!!not base64!!';
    });
    await expect(importBackupText(JSON.stringify(backup))).rejects.toThrow('damaged photo');
    expect(await dumpTables()).toEqual(before);
  });

  it('keeps existing data when the write fails partway', async () => {
    await seed();
    const before = await dumpTables();
    const text = await exportBackupText();
    vi.spyOn(db.printFilaments, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'));
    await expect(importBackupText(text)).rejects.toThrow('disk full');
    expect(await dumpTables()).toEqual(before);
  });
});

describe('eraseAllData', () => {
  it('clears tables and settings', async () => {
    await seed();
    await eraseAllData();
    expect(await db.spools.count()).toBe(0);
    expect(await db.prints.count()).toBe(0);
    expect(await db.printFilaments.count()).toBe(0);
    expect(getLowStockThreshold()).toBe(100);
  });
});
