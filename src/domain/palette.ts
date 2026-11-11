import { paintKey } from './paint';
import type { SavedColor, Spool } from './types';

type SpoolLook = Pick<Spool, 'material' | 'finish' | 'colorHex' | 'colorStops' | 'shiny' | 'colorName'>;

/** The palette entry for a spool's look, ready to save. */
export function savedColorFor(spool: SpoolLook, id: string, createdAt: string): SavedColor {
  return {
    id,
    material: spool.material,
    finish: spool.finish,
    colorHex: spool.colorHex,
    createdAt,
    ...(spool.colorName ? { name: spool.colorName } : {}),
    ...(spool.colorStops && spool.colorStops.length >= 2 ? { colorStops: [...spool.colorStops] } : {}),
    ...(spool.shiny ? { shiny: true } : {}),
  };
}

/** The saved color in the same material and finish with the same look, if any. */
export function findSavedColor(
  palette: readonly SavedColor[],
  spool: SpoolLook,
): SavedColor | undefined {
  const key = paintKey(spool);
  return palette.find(
    (color) =>
      color.material === spool.material && color.finish === spool.finish && paintKey(color) === key,
  );
}

/** Builds palettes from existing spools, one entry per distinct look per material and finish. */
export function palettesFromSpools(
  spools: readonly SpoolLook[],
  makeId: () => string,
  createdAt: string,
): SavedColor[] {
  const palette: SavedColor[] = [];
  for (const spool of spools) {
    if (!findSavedColor(palette, spool)) palette.push(savedColorFor(spool, makeId(), createdAt));
  }
  return palette;
}
