import { palettesFromSpools } from '../domain/palette';
import { base64ToBytes, bytesToBase64 } from '../domain/base64';
import { MAX_STOPS } from '../domain/paint';
import type { Print, PrintFilament, SavedColor, Spool } from '../domain/types';
import { migrateLegacyPhotos } from './migrations';
import { clearAllTables } from './repository';
import { db, SCHEMA_VERSION, type StoredPrint } from './schema';
import { getLowStockThreshold, resetSettings, setLowStockThreshold } from './settings';

export interface BackupPrint extends Omit<Print, 'photo'> {
  /** The photo's bytes as base64. */
  photo?: string;
  photoType?: string;
}

export interface Backup {
  app: 'filament-tracker';
  schemaVersion: number;
  exportedAt: string;
  settings: { lowStockThreshold: number };
  spools: Spool[];
  prints: BackupPrint[];
  printFilaments: PrintFilament[];
  /** Saved colors per material and finish. Added in schema version 2. */
  colors: SavedColor[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function toBackupPrint({ photoData, photoType, photo: _legacy, ...print }: StoredPrint): BackupPrint {
  if (!photoData) return print;
  return { ...print, photo: bytesToBase64(new Uint8Array(photoData)), photoType: photoType ?? 'image/jpeg' };
}

export async function createBackup(): Promise<Backup> {
  await migrateLegacyPhotos();
  const [spools, prints, printFilaments, colors] = await db.transaction(
    'r',
    [db.spools, db.prints, db.printFilaments, db.colors],
    () =>
      Promise.all([
        db.spools.toArray(),
        db.prints.toArray(),
        db.printFilaments.toArray(),
        db.colors.toArray(),
      ]),
  );

  return {
    app: 'filament-tracker',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { lowStockThreshold: getLowStockThreshold() },
    spools,
    prints: prints.map(toBackupPrint),
    printFilaments,
    colors,
  };
}

export async function exportBackupText(): Promise<string> {
  return JSON.stringify(await createBackup());
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isOptional = (check: (value: unknown) => boolean) => (value: unknown) =>
  value === undefined || check(value);
const isStops = (value: unknown) =>
  Array.isArray(value) && value.length <= MAX_STOPS && value.every(isText);

function hasValidPaint(value: Record<string, unknown>): boolean {
  return (
    isText(value.colorHex) &&
    isOptional(isStops)(value.colorStops) &&
    isOptional((shiny) => typeof shiny === 'boolean')(value.shiny)
  );
}

function isSpool(value: unknown): value is Spool {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.material) &&
    isText(value.finish) &&
    hasValidPaint(value) &&
    isOptional(isText)(value.colorName) &&
    isNumber(value.startGrams) &&
    isNumber(value.adjustmentGrams) &&
    isOptional(isText)(value.brand) &&
    isOptional(isNumber)(value.price) &&
    isOptional(isNumber)(value.spoolSizeGrams) &&
    typeof value.archived === 'boolean' &&
    isText(value.createdAt) &&
    isText(value.updatedAt)
  );
}

function isBackupPrint(value: unknown): value is BackupPrint {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name) &&
    isOptional(isText)(value.photo) &&
    isOptional(isText)(value.photoType) &&
    typeof value.photoPending === 'boolean' &&
    isText(value.createdAt) &&
    isText(value.updatedAt)
  );
}

function isPrintFilament(value: unknown): value is PrintFilament {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.printId) &&
    isText(value.spoolId) &&
    (value.slot === 1 || value.slot === 2 || value.slot === 3 || value.slot === 4) &&
    isNumber(value.grams) &&
    value.grams >= 0
  );
}

function isSavedColor(value: unknown): value is SavedColor {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.material) &&
    isText(value.finish) &&
    isOptional(isText)(value.name) &&
    hasValidPaint(value) &&
    isText(value.createdAt)
  );
}

/** Checks a backup file thoroughly, so a bad file can never replace good data. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file isn’t valid JSON.');
  }

  if (!isRecord(data) || data.app !== 'filament-tracker') {
    throw new BackupError('That file isn’t a Filament Tracker backup.');
  }
  if (!isNumber(data.schemaVersion) || data.schemaVersion < 1) {
    throw new BackupError('That backup has no valid schema version.');
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('That backup is from a newer version of the app. Update first.');
  }

  // Version 1 backups have no saved colors; they're rebuilt from the spools below.
  const colors = data.schemaVersion >= 2 ? data.colors : [];
  const { spools, prints, printFilaments, settings } = data;
  if (
    !Array.isArray(spools) ||
    !spools.every(isSpool) ||
    !Array.isArray(prints) ||
    !prints.every(isBackupPrint) ||
    !Array.isArray(printFilaments) ||
    !printFilaments.every(isPrintFilament) ||
    !Array.isArray(colors) ||
    !colors.every(isSavedColor) ||
    !isRecord(settings) ||
    !isNumber(settings.lowStockThreshold) ||
    settings.lowStockThreshold < 0
  ) {
    throw new BackupError('That backup is damaged or incomplete.');
  }

  const spoolIds = new Set(spools.map((spool) => spool.id));
  const printIds = new Set(prints.map((print) => print.id));
  if (!printFilaments.every((row) => spoolIds.has(row.spoolId) && printIds.has(row.printId))) {
    throw new BackupError('That backup is damaged or incomplete.');
  }

  const palette =
    data.schemaVersion >= 2
      ? (colors as SavedColor[])
      : palettesFromSpools(spools, () => crypto.randomUUID(), new Date().toISOString());
  return { ...(data as unknown as Backup), colors: palette };
}

function decodePrint({ photo, photoType, ...print }: BackupPrint): StoredPrint {
  if (photo === undefined) return print;
  try {
    return { ...print, photoData: base64ToBytes(photo).buffer, photoType: photoType ?? 'image/jpeg' };
  } catch {
    throw new BackupError('That backup has a damaged photo.');
  }
}

/** Replaces everything with the backup, in one transaction. On any failure nothing changes. */
export async function importBackupText(text: string): Promise<void> {
  const backup = parseBackup(text);
  const prints = backup.prints.map(decodePrint);

  await db.transaction('rw', [db.spools, db.prints, db.printFilaments, db.colors], async () => {
    await Promise.all([
      db.spools.clear(),
      db.prints.clear(),
      db.printFilaments.clear(),
      db.colors.clear(),
    ]);
    await db.spools.bulkAdd(backup.spools);
    await db.prints.bulkAdd(prints);
    await db.printFilaments.bulkAdd(backup.printFilaments);
    await db.colors.bulkAdd(backup.colors);
  });
  setLowStockThreshold(backup.settings.lowStockThreshold);
}

export async function eraseAllData(): Promise<void> {
  await clearAllTables();
  resetSettings();
}
