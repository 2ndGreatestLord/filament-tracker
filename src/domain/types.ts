export type Slot = 1 | 2 | 3 | 4;

export interface Spool {
  id: string;
  material: string;
  finish: string;
  colorHex: string;
  /** Gradient stops, the first equal to `colorHex`. Absent for a single color. */
  colorStops?: string[];
  shiny?: boolean;
  colorName?: string;
  startGrams: number;
  adjustmentGrams: number;
  brand?: string;
  price?: number;
  spoolSizeGrams?: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Print {
  id: string;
  name: string;
  photo?: Blob;
  photoPending: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrintFilament {
  id: string;
  printId: string;
  spoolId: string;
  slot: Slot;
  grams: number;
}

/** A color remembered for one material and finish, such as PLA · Matte. */
export interface SavedColor {
  id: string;
  material: string;
  finish: string;
  name?: string;
  colorHex: string;
  colorStops?: string[];
  shiny?: boolean;
  createdAt: string;
}
