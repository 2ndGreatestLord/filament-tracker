import Dexie, { type EntityTable } from 'dexie';
import type { Print, PrintFilament, Spool } from '../domain/types';

/** Bump together with a new `version(n)` below. Also written into backups. */
export const SCHEMA_VERSION = 1;

export class FilamentDb extends Dexie {
  spools!: EntityTable<Spool, 'id'>;
  prints!: EntityTable<Print, 'id'>;
  printFilaments!: EntityTable<PrintFilament, 'id'>;

  constructor() {
    super('filament-tracker');
    this.version(1).stores({
      spools: 'id, createdAt',
      prints: 'id, createdAt',
      printFilaments: 'id, printId, spoolId',
    });
  }
}

export const db = new FilamentDb();
