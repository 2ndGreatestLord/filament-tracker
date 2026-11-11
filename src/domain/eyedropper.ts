/** Picking a filament color from a photo, like an eyedropper. */

/** Photos are shrunk to this longest side before sampling. Plenty for a color, and fast. */
export const PICK_MAX_EDGE = 480;

/**
 * Half the width of the square that's sampled around the tapped point, in pixels of the shrunk
 * photo. Sampling an area instead of one pixel smooths out noise and the filament's texture.
 */
export const SAMPLE_RADIUS = 6;

/** RGBA pixels, laid out like the browser's `ImageData`. */
export interface Pixels {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * The color around a pixel, as hex. Uses the median of each channel over a square, so a
 * glint of light or a dark gap between strands in the sample doesn't skew the result the way
 * an average would. Transparent pixels are ignored. Returns null if there's nothing to sample.
 */
export function sampleColor(
  pixels: Pixels,
  x: number,
  y: number,
  radius: number = SAMPLE_RADIUS,
): string | null {
  if (pixels.width < 1 || pixels.height < 1) return null;
  const cx = clamp(Math.round(x), 0, pixels.width - 1);
  const cy = clamp(Math.round(y), 0, pixels.height - 1);
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  for (let py = Math.max(0, cy - radius); py <= Math.min(pixels.height - 1, cy + radius); py++) {
    for (let px = Math.max(0, cx - radius); px <= Math.min(pixels.width - 1, cx + radius); px++) {
      const i = (py * pixels.width + px) * 4;
      if ((pixels.data[i + 3] ?? 0) === 0) continue;
      reds.push(pixels.data[i] ?? 0);
      greens.push(pixels.data[i + 1] ?? 0);
      blues.push(pixels.data[i + 2] ?? 0);
    }
  }
  if (reds.length === 0) return null;
  return rgbToHex(median(reds), median(greens), median(blues));
}

/**
 * Converts a point on the displayed photo (screen coordinates) to a pixel in the shrunk
 * photo, clamped to its edges. The photo is displayed at its own aspect ratio inside `box`.
 */
export function toPixel(point: Point, box: Box, pixels: Pixels): Point {
  const fx = box.width > 0 ? (point.x - box.left) / box.width : 0.5;
  const fy = box.height > 0 ? (point.y - box.top) / box.height : 0.5;
  return {
    x: clamp(Math.floor(clamp(fx, 0, 1) * pixels.width), 0, pixels.width - 1),
    y: clamp(Math.floor(clamp(fy, 0, 1) * pixels.height), 0, pixels.height - 1),
  };
}
