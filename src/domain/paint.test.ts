import { describe, expect, it } from 'vitest';
import {
  isGradient,
  paintBackground,
  paintDescription,
  paintKey,
  paintStops,
} from './paint';

describe('paintStops and isGradient', () => {
  it('is the single color without stops', () => {
    expect(paintStops({ colorHex: '#ff0000' })).toEqual(['#ff0000']);
    expect(isGradient({ colorHex: '#ff0000' })).toBe(false);
  });

  it('ignores a one-stop list', () => {
    expect(isGradient({ colorHex: '#ff0000', colorStops: ['#ff0000'] })).toBe(false);
  });

  it('uses every stop for a gradient', () => {
    const paint = { colorHex: '#ff0000', colorStops: ['#ff0000', '#0000ff', '#00ff00'] };
    expect(paintStops(paint)).toEqual(['#ff0000', '#0000ff', '#00ff00']);
    expect(isGradient(paint)).toBe(true);
  });
});

describe('paintKey', () => {
  it('treats the same look as the same, whatever the letter case', () => {
    expect(paintKey({ colorHex: '#FF0000' })).toBe(paintKey({ colorHex: '#ff0000' }));
  });

  it('tells shiny, gradient, and order apart', () => {
    const flat = paintKey({ colorHex: '#ff0000' });
    expect(paintKey({ colorHex: '#ff0000', shiny: true })).not.toBe(flat);
    expect(
      paintKey({ colorHex: '#ff0000', colorStops: ['#ff0000', '#0000ff'] }),
    ).not.toBe(paintKey({ colorHex: '#0000ff', colorStops: ['#0000ff', '#ff0000'] }));
  });
});

describe('paintBackground', () => {
  it('is a plain color', () => {
    expect(paintBackground({ colorHex: '#ff0000' })).toBe('#ff0000');
  });

  it('is a diagonal gradient', () => {
    expect(paintBackground({ colorHex: '#f00', colorStops: ['#f00', '#00f'] })).toBe(
      'linear-gradient(135deg, #f00, #00f)',
    );
  });

  it('adds a sheen layer on top when shiny', () => {
    const background = paintBackground({ colorHex: '#f00', colorStops: ['#f00', '#00f'], shiny: true });
    expect(background.startsWith('linear-gradient(135deg, rgba(255,255,255,0)')).toBe(true);
    expect(background.endsWith('linear-gradient(135deg, #f00, #00f)')).toBe(true);
  });
});

describe('paintDescription', () => {
  it('names the look in words', () => {
    expect(paintDescription({ colorHex: '#f00' }, 'Red')).toBe('Red');
    expect(paintDescription({ colorHex: '#f00', shiny: true }, 'Red')).toBe('Red, shiny');
    expect(
      paintDescription({ colorHex: '#f00', colorStops: ['#f00', '#00f'], shiny: true }, 'Sunset'),
    ).toBe('Sunset, gradient, shiny');
    expect(paintDescription({ colorHex: '#f00', colorStops: ['#f00', '#00f'] })).toBe(
      'Custom gradient',
    );
  });
});
