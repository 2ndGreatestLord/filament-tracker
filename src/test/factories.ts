import { addSpool, type NewSpool } from '../db/repository';
import type { Spool } from '../domain/types';

export function spoolInput(overrides: Partial<NewSpool> = {}): NewSpool {
  return {
    material: 'PLA',
    finish: 'Matte',
    colorHex: '#ff0000',
    colorName: 'Red',
    startGrams: 1000,
    ...overrides,
  };
}

export function makeSpool(overrides: Partial<NewSpool> = {}): Promise<Spool> {
  return addSpool(spoolInput(overrides));
}
