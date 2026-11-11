import { describe, expect, it } from 'vitest';
import { filamentRadius, holesPath, REEL, reelHoles } from './reel';

const area = (r: number) => Math.PI * r * r;

describe('filamentRadius', () => {
  it('sits on the barrel when empty and reaches the rim when full', () => {
    expect(filamentRadius(0)).toBeCloseTo(REEL.filamentCore);
    expect(filamentRadius(1)).toBeCloseTo(REEL.filamentFull);
  });

  it('is proportional to the filament left, by area', () => {
    const wound = (f: number) => area(filamentRadius(f)) - area(REEL.filamentCore);
    expect(wound(0.5) / wound(1)).toBeCloseTo(0.5);
    expect(wound(0.25) / wound(1)).toBeCloseTo(0.25);
  });

  it('grows with the amount left and clamps outside 0 to 1', () => {
    expect(filamentRadius(0.6)).toBeGreaterThan(filamentRadius(0.3));
    expect(filamentRadius(-1)).toBeCloseTo(REEL.filamentCore);
    expect(filamentRadius(2)).toBeCloseTo(REEL.filamentFull);
  });

  it('never reaches into the centre hole', () => {
    expect(filamentRadius(0)).toBeGreaterThan(REEL.centerHole);
  });
});

describe('reelHoles', () => {
  const holes = reelHoles();
  const distance = (h: { x: number; y: number }) => Math.hypot(h.x - 50, h.y - 50);

  it('has a dense grid of holes, like the reference reel', () => {
    expect(holes.length).toBeGreaterThan(250);
  });

  it('keeps the hub and centre solid', () => {
    expect(holes.every((hole) => distance(hole) - hole.r > REEL.hub)).toBe(true);
  });

  it('stays inside the rim', () => {
    expect(holes.every((hole) => distance(hole) + hole.r < REEL.rim)).toBe(true);
  });

  it('leaves the label pad solid', () => {
    const pad = REEL.labelPad;
    const inPad = holes.filter(
      (h) => h.x > pad.x && h.x < pad.x + pad.width && h.y > pad.y && h.y < pad.y + pad.height,
    );
    expect(inPad).toHaveLength(0);
  });

  it('makes the middle holes the largest', () => {
    const middle = holes.filter((h) => Math.abs(distance(h) - 34) < 2);
    const inner = holes.filter((h) => distance(h) < 25);
    expect(Math.min(...middle.map((h) => h.r))).toBeGreaterThan(Math.max(...inner.map((h) => h.r)));
  });
});

describe('holesPath', () => {
  it('draws each hole as one closed circle', () => {
    expect(holesPath([{ x: 10, y: 20, r: 1 }])).toBe('M9 20a1 1 0 1 0 2 0a1 1 0 1 0 -2 0');
    expect(holesPath(reelHoles()).match(/M/g)).toHaveLength(reelHoles().length);
  });
});
