import Dexie, { type EntityTable } from 'dexie';
import { palettesFromSpools } from '../domain/palette';
import type { Print, PrintFilament, SavedColor, Spool } from '../domain/types';

/** Bump together with a new `version(n)` below. Also written into backups. */
export const SCHEMA_VERSION = 2;

/**
 * A print as stored. Photos are kept as raw bytes, because Safari can't reliably keep
 * Blobs in IndexedDB. Repository functions turn them back into Blobs.
 */
export interface StoredPrint extends Omit<Print, 'photo'> {
  photoData?: ArrayBuffer;
  photoType?: string;
  /** Version 1 kept a Blob here. Moved to `photoData` by `migrateLegacyPhotos`. */
  photo?: Blob;
}

export class FilamentDb extends Dexie {
  spools!: EntityTable<Spool, 'id'>;
  prints!: EntityTable<StoredPrint, 'id'>;
  printFilaments!: EntityTable<PrintFilament, 'id'>;
  colors!: EntityTable<SavedColor, 'id'>;

  constructor(name = 'filament-tracker') {
    super(name);
    this.version(1).stores({
      spools: 'id, createdAt',
      prints: 'id, createdAt',
      printFilaments: 'id, printId, spoolId',
    });
    // Version 2 adds a color palette per material and finish, seeded from existing spools.
    this.version(2)
      .stores({ colors: 'id, [material+finish]' })
      .upgrade(async (tx) => {
        const spools = await tx.table<Spool>('spools').toArray();
        const palette = palettesFromSpools(spools, () => crypto.randomUUID(), new Date().toISOString());
        await tx.table<SavedColor>('colors').bulkAdd(palette);
      });
  }
}

export const db = new FilamentDb();
