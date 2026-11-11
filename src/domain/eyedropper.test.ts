import { describe, expect, it } from 'vitest';
import { rgbToHex, sampleColor, toPixel, type Pixels } from './eyedropper';

/** A photo filled with one color, with optional pixels painted over it. */
function photo(
  width: number,
  height: number,
  fill: [number, number, number, number],
  paint: Array<[number, number, [number, number, number, number]]> = [],
): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(fill, i * 4);
  for (const [x, y, rgba] of paint) data.set(rgba, (y * width + x) * 4);
  return { width, height, data };
}

describe('rgbToHex', () => {
  it('formats lowercase 6-digit hex, rounding and clamping', () => {
    expect(rgbToHex(255, 0, 16)).toBe('#ff0010');
    expect(rgbToHex(12.6, -4, 300)).toBe('#0d00ff');
  });
});

describe('sampleColor', () => {
  it('reads the color under the point', () => {
    expect(sampleColor(photo(20, 20, [30, 120, 200, 255]), 10, 10)).toBe('#1e78c8');
  });

  it('ignores a glint of light and a dark gap in the sample', () => {
    const glints: Array<[number, number, [number, number, number, number]]> = [
      [10, 10, [255, 255, 255, 255]],
      [11, 10, [255, 255, 255, 255]],
      [9, 11, [0, 0, 0, 255]],
    ];
    expect(sampleColor(photo(20, 20, [200, 40, 40, 255], glints), 10, 10, 2)).toBe('#c82828');
  });

  it('samples only near the point', () => {
    const half = photo(20, 10, [255, 0, 0, 255]);
    for (let y = 0; y < 10; y++) for (let x = 10; x < 20; x++) (half.data as Uint8ClampedArray).set([0, 0, 255, 255], (y * 20 + x) * 4);
    expect(sampleColor(half, 3, 5, 2)).toBe('#ff0000');
    expect(sampleColor(half, 16, 5, 2)).toBe('#0000ff');
  });

  it('clamps points outside the photo to its edge', () => {
    expect(sampleColor(photo(4, 4, [1, 2, 3, 255]), -50, 99)).toBe('#010203');
  });

  it('skips transparent pixels, and returns null when there is nothing to sample', () => {
    const mostlyClear = photo(5, 5, [0, 0, 0, 0], [[2, 2, [9, 9, 9, 255]]]);
    expect(sampleColor(mostlyClear, 2, 2)).toBe('#090909');
    expect(sampleColor(photo(5, 5, [0, 0, 0, 0]), 2, 2)).toBeNull();
    expect(sampleColor({ width: 0, height: 0, data: [] }, 0, 0)).toBeNull();
  });
});

describe('toPixel', () => {
  const pixels = photo(480, 360, [0, 0, 0, 255]);
  const box = { left: 10, top: 100, width: 240, height: 180 };

  it('maps a point on the displayed photo to a photo pixel', () => {
    expect(toPixel({ x: 10, y: 100 }, box, pixels)).toEqual({ x: 0, y: 0 });
    expect(toPixel({ x: 130, y: 190 }, box, pixels)).toEqual({ x: 240, y: 180 });
  });

  it('keeps points dragged past the edge on the photo', () => {
    expect(toPixel({ x: 9999, y: -50 }, box, pixels)).toEqual({ x: 479, y: 0 });
  });

  it('uses the center when the photo has no size on screen', () => {
    expect(toPixel({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 }, pixels)).toEqual({
      x: 240,
      y: 180,
    });
  });
});
