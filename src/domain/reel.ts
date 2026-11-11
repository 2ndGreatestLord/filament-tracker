/** Geometry of the spool graphic, in a 100 × 100 view box centred on (50, 50). */
export const REEL = {
  center: 50,
  /** Outer edge of the reel's side plate. */
  rim: 48,
  /** The hole through the middle. Filament never shows here. */
  centerHole: 10,
  /** The solid hub ring around the centre hole. */
  hub: 21,
  /** Filament winds outward from the barrel... */
  filamentCore: 21,
  /** ...to here when the spool is full. */
  filamentFull: 47,
  /** The holes sit between these radii. */
  holesInner: 23.5,
  holesOuter: 45,
  holeSpacing: 3.6,
  /** The solid label pad on the left, as in the real reel. */
  labelPad: { x: 5, y: 45.5, width: 15.5, height: 9, radius: 4.5 },
} as const;

/**
 * Outer radius of the filament for the fraction left. The wound filament's face area is
 * proportional to how much is left, like a real spool.
 */
export function filamentRadius(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  const core = REEL.filamentCore;
  const full = REEL.filamentFull;
  return Math.sqrt(core * core + f * (full * full - core * core));
}

export interface Hole {
  x: number;
  y: number;
  r: number;
}

function insideLabelPad(x: number, y: number, margin: number): boolean {
  const pad = REEL.labelPad;
  return (
    x > pad.x - margin &&
    x < pad.x + pad.width + margin &&
    y > pad.y - margin &&
    y < pad.y + pad.height + margin
  );
}

/** A square grid of holes, largest midway between hub and rim, as on the reference reel. */
export function reelHoles(): Hole[] {
  const holes: Hole[] = [];
  const { center, holesInner, holesOuter, holeSpacing } = REEL;
  const steps = Math.ceil(holesOuter / holeSpacing);
  for (let row = -steps; row <= steps; row += 1) {
    for (let col = -steps; col <= steps; col += 1) {
      const x = center + col * holeSpacing;
      const y = center + row * holeSpacing;
      const distance = Math.hypot(x - center, y - center);
      if (distance < holesInner || distance > holesOuter) continue;
      if (insideLabelPad(x, y, 1.6)) continue;
      const t = (distance - holesInner) / (holesOuter - holesInner);
      holes.push({ x, y, r: 0.75 + 0.7 * Math.sin(Math.PI * t) });
    }
  }
  // Small notches near the rim at 12 and 6 o'clock.
  for (const [dx, dy] of [
    [-4.5, -45.5],
    [4.5, -45.5],
    [-4.5, 45.5],
    [4.5, 45.5],
  ] as const) {
    holes.push({ x: center + dx, y: center + dy, r: 0.8 });
  }
  return holes;
}

/** All holes as one SVG path, which is far cheaper to draw than hundreds of circles. */
export function holesPath(holes: readonly Hole[]): string {
  return holes
    .map(({ x, y, r }) => {
      const left = +(x - r).toFixed(2);
      const top = +y.toFixed(2);
      const d = +(r * 2).toFixed(2);
      const rr = +r.toFixed(2);
      return `M${left} ${top}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
    })
    .join('');
}
