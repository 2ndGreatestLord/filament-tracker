import { describe, expect, it } from 'vitest';
import { findSavedColor, palettesFromSpools, savedColorFor } from './palette';

const base = { material: 'PLA', finish: 'Matte', colorHex: '#ff0000' };

describe('palettes', () => {
  it('builds an entry with only the fields that apply', () => {
    expect(savedColorFor({ ...base, colorName: 'Red' }, 'a', 't')).toEqual({
      id: 'a',
      material: 'PLA',
      finish: 'Matte',
      colorHex: '#ff0000',
      name: 'Red',
      createdAt: 't',
    });
    expect(
      savedColorFor({ ...base, colorStops: ['#ff0000', '#0000ff'], shiny: true }, 'b', 't'),
    ).toMatchObject({ colorStops: ['#ff0000', '#0000ff'], shiny: true });
  });

  it('keeps each material and finish separate', () => {
    let next = 0;
    const palette = palettesFromSpools(
      [
        base,
        { ...base, finish: 'Basic' },
        { ...base, material: 'PETG', finish: 'Basic' },
        base,
      ],
      () => String(next++),
      't',
    );
    expect(palette.map((c) => `${c.material} ${c.finish}`)).toEqual([
      'PLA Matte',
      'PLA Basic',
      'PETG Basic',
    ]);
  });

  it('keeps shiny and gradient variants of a color as separate entries', () => {
    let next = 0;
    const palette = palettesFromSpools(
      [base, { ...base, shiny: true }, { ...base, colorStops: ['#ff0000', '#00ff00'] }],
      () => String(next++),
      't',
    );
    expect(palette).toHaveLength(3);
  });

  it('finds a match only within the same material and finish', () => {
    const palette = [savedColorFor(base, 'a', 't')];
    expect(findSavedColor(palette, { ...base, colorHex: '#FF0000' })?.id).toBe('a');
    expect(findSavedColor(palette, { ...base, finish: 'Silk' })).toBeUndefined();
  });
});
