import { adjustmentForMeasured, computeRemaining, sumGrams } from '../domain/grams';
import { findSavedColor, savedColorFor } from '../domain/palette';
import type { Print, PrintFilament, SavedColor, Slot, Spool } from '../domain/types';
import { db, type StoredPrint } from './schema';

export type NewSpool = Omit<
  Spool,
  'id' | 'adjustmentGrams' | 'archived' | 'createdAt' | 'updatedAt'
>;

export interface SpoolWithRemaining extends Spool {
  remaining: number;
  used: number;
}

export interface SpoolUsage {
  print: Print;
  grams: number;
}

export interface SpoolDetail extends SpoolWithRemaining {
  history: SpoolUsage[];
}

export interface NewPrintFilament {
  spoolId: string;
  slot: Slot;
  grams: number;
}

export interface NewPrint {
  name: string;
  filaments: NewPrintFilament[];
  photo?: Blob;
  photoPending?: boolean;
}

export interface PrintFilamentWithSpool extends PrintFilament {
  spool: SpoolWithRemaining;
}

export interface PrintSummary {
  print: Print;
  filaments: PrintFilamentWithSpool[];
  totalGrams: number;
}

/** Everything needed to undo a print delete, exactly as it was stored. */
export interface PrintSnapshot {
  print: StoredPrint;
  filaments: PrintFilament[];
}

export class SpoolInUseError extends Error {
  constructor() {
    super('This spool is used by saved prints.');
    this.name = 'SpoolInUseError';
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
    this.name = 'NotFoundError';
  }
}

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function assertValidGrams(grams: number): void {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new RangeError('Grams must be a number of at least 0.');
  }
}

function withRemaining(spool: Spool, usages: readonly number[]): SpoolWithRemaining {
  return { ...spool, remaining: computeRemaining(spool, usages), used: sumGrams(usages) };
}

async function usagesForSpool(spoolId: string): Promise<number[]> {
  const rows = await db.printFilaments.where('spoolId').equals(spoolId).toArray();
  return rows.map((row) => row.grams);
}

// Photos

/** Reads a photo's bytes. Done before a transaction starts, since it isn't a database call. */
async function photoFields(photo: Blob): Promise<Pick<StoredPrint, 'photoData' | 'photoType'>> {
  return { photoData: await photo.arrayBuffer(), photoType: photo.type || 'image/jpeg' };
}

/** Turns a stored print back into one with a Blob photo. */
export function fromStored(row: StoredPrint): Print {
  const { photoData, photoType, photo: legacy, ...print } = row;
  if (photoData) return { ...print, photo: new Blob([photoData], { type: photoType ?? 'image/jpeg' }) };
  if (legacy instanceof Blob) return { ...print, photo: legacy };
  return print;
}

// Saved colors

/** Remembers a spool's look in its material and finish palette. Call inside a transaction. */
async function rememberColor(spool: Spool): Promise<void> {
  const palette = await db.colors
    .where('[material+finish]')
    .equals([spool.material, spool.finish])
    .toArray();
  const match = findSavedColor(palette, spool);
  if (!match) {
    await db.colors.add(savedColorFor(spool, newId(), now()));
  } else if (spool.colorName && match.name !== spool.colorName) {
    await db.colors.put({ ...match, name: spool.colorName });
  }
}

/** The colors saved for one material and finish, oldest first. */
export async function listSavedColors(material: string, finish: string): Promise<SavedColor[]> {
  const colors = await db.colors.where('[material+finish]').equals([material, finish]).toArray();
  return colors.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteSavedColor(id: string): Promise<SavedColor> {
  return db.transaction('rw', db.colors, async () => {
    const color = await db.colors.get(id);
    if (!color) throw new NotFoundError('Color');
    await db.colors.delete(id);
    return color;
  });
}

export async function restoreSavedColor(color: SavedColor): Promise<void> {
  await db.colors.put(color);
}

// Spools

export async function addSpool(input: NewSpool): Promise<Spool> {
  const timestamp = now();
  const spool: Spool = {
    ...input,
    id: newId(),
    adjustmentGrams: 0,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.transaction('rw', db.spools, db.colors, async () => {
    await db.spools.add(spool);
    await rememberColor(spool);
  });
  return spool;
}

export async function updateSpool(id: string, changes: Partial<NewSpool>): Promise<void> {
  await db.transaction('rw', db.spools, db.colors, async () => {
    const spool = await db.spools.get(id);
    if (!spool) throw new NotFoundError('Spool');
    const updated = { ...spool, ...changes, updatedAt: now() };
    await db.spools.put(updated);
    await rememberColor(updated);
  });
}

export async function getSpool(id: string): Promise<Spool | undefined> {
  return db.spools.get(id);
}

export async function getSpoolRemaining(id: string): Promise<number> {
  return db.transaction('r', db.spools, db.printFilaments, async () => {
    const spool = await db.spools.get(id);
    if (!spool) throw new NotFoundError('Spool');
    return computeRemaining(spool, await usagesForSpool(id));
  });
}

export async function listSpoolsWithRemaining(): Promise<SpoolWithRemaining[]> {
  return db.transaction('r', db.spools, db.printFilaments, async () => {
    const [spools, rows] = await Promise.all([
      db.spools.orderBy('createdAt').toArray(),
      db.printFilaments.toArray(),
    ]);
    return spools.map((spool) =>
      withRemaining(
        spool,
        rows.filter((row) => row.spoolId === spool.id).map((row) => row.grams),
      ),
    );
  });
}

export async function getSpoolDetail(id: string): Promise<SpoolDetail | null> {
  return db.transaction('r', db.spools, db.prints, db.printFilaments, async () => {
    const spool = await db.spools.get(id);
    if (!spool) return null;
    const rows = await db.printFilaments.where('spoolId').equals(id).toArray();
    const prints = await db.prints.bulkGet(rows.map((row) => row.printId));
    const history = rows
      .flatMap((row, index) => {
        const print = prints[index];
        return print ? [{ print: fromStored(print), grams: row.grams }] : [];
      })
      .sort((a, b) => b.print.createdAt.localeCompare(a.print.createdAt));
    return {
      ...withRemaining(
        spool,
        rows.map((row) => row.grams),
      ),
      history,
    };
  });
}

/** Corrects a spool after weighing it, by changing `adjustmentGrams`. */
export async function adjustSpoolRemaining(id: string, measuredGrams: number): Promise<void> {
  assertValidGrams(measuredGrams);
  await db.transaction('rw', db.spools, db.printFilaments, async () => {
    const spool = await db.spools.get(id);
    if (!spool) throw new NotFoundError('Spool');
    const adjustmentGrams = adjustmentForMeasured(
      spool,
      await usagesForSpool(id),
      measuredGrams,
    );
    await db.spools.put({ ...spool, adjustmentGrams, updatedAt: now() });
  });
}

export async function setSpoolArchived(id: string, archived: boolean): Promise<void> {
  await db.transaction('rw', db.spools, async () => {
    const spool = await db.spools.get(id);
    if (!spool) throw new NotFoundError('Spool');
    await db.spools.put({ ...spool, archived, updatedAt: now() });
  });
}

/** Deletes a spool no print refers to, and returns it so the delete can be undone. */
export async function deleteSpool(id: string): Promise<Spool> {
  return db.transaction('rw', db.spools, db.printFilaments, async () => {
    const spool = await db.spools.get(id);
    if (!spool) throw new NotFoundError('Spool');
    const references = await db.printFilaments.where('spoolId').equals(id).count();
    if (references > 0) throw new SpoolInUseError();
    await db.spools.delete(id);
    return spool;
  });
}

export async function restoreSpool(spool: Spool): Promise<void> {
  await db.spools.put(spool);
}

// Prints

function assertValidNewPrint(input: NewPrint): void {
  if (!input.name.trim()) throw new RangeError('A print needs a name.');
  if (input.filaments.length === 0) throw new RangeError('A print needs at least one filament.');
  const slots = new Set(input.filaments.map((filament) => filament.slot));
  if (slots.size !== input.filaments.length) throw new RangeError('Slots must be different.');
  input.filaments.forEach((filament) => assertValidGrams(filament.grams));
}

/** Writes the print and all of its filament rows in one transaction. */
export async function addPrint(input: NewPrint): Promise<Print> {
  assertValidNewPrint(input);
  const timestamp = now();
  const stored: StoredPrint = {
    id: newId(),
    name: input.name.trim(),
    photoPending: input.photoPending ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(input.photo ? await photoFields(input.photo) : {}),
  };
  const rows: PrintFilament[] = input.filaments.map((filament) => ({
    id: newId(),
    printId: stored.id,
    spoolId: filament.spoolId,
    slot: filament.slot,
    grams: filament.grams,
  }));

  await db.transaction('rw', db.spools, db.prints, db.printFilaments, async () => {
    const spools = await db.spools.bulkGet(rows.map((row) => row.spoolId));
    if (spools.some((spool) => !spool)) throw new NotFoundError('Spool');
    await db.prints.add(stored);
    await db.printFilaments.bulkAdd(rows);
  });
  return fromStored(stored);
}

/** Changes the grams on a print's filament rows, keyed by row id, in one transaction. */
export async function updatePrintGrams(
  printId: string,
  gramsByRowId: Readonly<Record<string, number>>,
): Promise<void> {
  Object.values(gramsByRowId).forEach(assertValidGrams);
  await db.transaction('rw', db.prints, db.printFilaments, async () => {
    const print = await db.prints.get(printId);
    if (!print) throw new NotFoundError('Print');
    const rows = await db.printFilaments.where('printId').equals(printId).toArray();
    const updated = rows.map((row) => ({ ...row, grams: gramsByRowId[row.id] ?? row.grams }));
    await db.printFilaments.bulkPut(updated);
    await db.prints.put({ ...print, updatedAt: now() });
  });
}

export async function setPrintPhoto(printId: string, photo: Blob): Promise<void> {
  const fields = await photoFields(photo);
  await db.transaction('rw', db.prints, async () => {
    const print = await db.prints.get(printId);
    if (!print) throw new NotFoundError('Print');
    const { photo: _legacy, ...rest } = print;
    await db.prints.put({ ...rest, ...fields, photoPending: false, updatedAt: now() });
  });
}

/**
 * Deletes a print and its filament rows in one transaction, which gives the grams
 * back to the spools. Returns a snapshot so the delete can be undone.
 */
export async function deletePrint(printId: string): Promise<PrintSnapshot> {
  return db.transaction('rw', db.prints, db.printFilaments, async () => {
    const print = await db.prints.get(printId);
    if (!print) throw new NotFoundError('Print');
    const filaments = await db.printFilaments.where('printId').equals(printId).toArray();
    await db.printFilaments.bulkDelete(filaments.map((row) => row.id));
    await db.prints.delete(printId);
    return { print, filaments };
  });
}

export async function restorePrint(snapshot: PrintSnapshot): Promise<void> {
  await db.transaction('rw', db.spools, db.prints, db.printFilaments, async () => {
    const spools = await db.spools.bulkGet(snapshot.filaments.map((row) => row.spoolId));
    if (spools.some((spool) => !spool)) throw new NotFoundError('Spool');
    await db.prints.put(snapshot.print);
    await db.printFilaments.bulkPut(snapshot.filaments);
  });
}

function summarize(
  print: Print,
  allRows: readonly PrintFilament[],
  spools: readonly Spool[],
): PrintSummary {
  const rows = allRows
    .filter((row) => row.printId === print.id)
    .sort((a, b) => a.slot - b.slot);
  const filaments = rows.flatMap((row) => {
    const spool = spools.find((candidate) => candidate.id === row.spoolId);
    if (!spool) return [];
    const usages = allRows.filter((other) => other.spoolId === spool.id).map((r) => r.grams);
    return [{ ...row, spool: withRemaining(spool, usages) }];
  });
  return { print, filaments, totalGrams: sumGrams(rows.map((row) => row.grams)) };
}

/** All prints, newest first, with their filaments. */
export async function listPrintSummaries(): Promise<PrintSummary[]> {
  return db.transaction('r', db.spools, db.prints, db.printFilaments, async () => {
    const [prints, rows, spools] = await Promise.all([
      db.prints.orderBy('createdAt').reverse().toArray(),
      db.printFilaments.toArray(),
      db.spools.toArray(),
    ]);
    return prints.map((print) => summarize(fromStored(print), rows, spools));
  });
}

export async function getPrintSummary(id: string): Promise<PrintSummary | null> {
  return db.transaction('r', db.spools, db.prints, db.printFilaments, async () => {
    const print = await db.prints.get(id);
    if (!print) return null;
    const [rows, spools] = await Promise.all([
      db.printFilaments.toArray(),
      db.spools.toArray(),
    ]);
    return summarize(fromStored(print), rows, spools);
  });
}

/** Removes every spool, print, filament row, and saved color in one transaction. */
export async function clearAllTables(): Promise<void> {
  await db.transaction('rw', [db.spools, db.prints, db.printFilaments, db.colors], async () => {
    await Promise.all([
      db.spools.clear(),
      db.prints.clear(),
      db.printFilaments.clear(),
      db.colors.clear(),
    ]);
  });
}
