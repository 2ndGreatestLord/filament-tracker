import { describe, expect, it } from 'vitest';
import {
  coastDistance,
  coastStep,
  flickVelocity,
  FRICTION_MS,
  MAX_VELOCITY,
  releaseVelocity,
  spinDegrees,
  type Coast,
} from './momentum';

function coastUntilStopped(start: Coast, frameMs = 16): { coast: Coast; frames: number } {
  let coast = start;
  let frames = 0;
  while (coast.velocity !== 0 && frames < 10_000) {
    coast = coastStep(coast, frameMs);
    frames += 1;
  }
  return { coast, frames };
}

describe('releaseVelocity', () => {
  it('measures grams per millisecond over the end of the drag', () => {
    const samples = [
      { time: 0, grams: 0 },
      { time: 100, grams: 5 },
      { time: 140, grams: 9 },
      { time: 180, grams: 13 },
    ];
    expect(releaseVelocity(samples, 185)).toBeCloseTo(0.1);
  });

  it('is 0 if the finger paused before lifting', () => {
    expect(releaseVelocity([{ time: 0, grams: 0 }, { time: 20, grams: 4 }], 200)).toBe(0);
  });

  it('is 0 with too few samples', () => {
    expect(releaseVelocity([], 0)).toBe(0);
    expect(releaseVelocity([{ time: 0, grams: 3 }], 0)).toBe(0);
  });

  it('is negative when turning counterclockwise', () => {
    expect(releaseVelocity([{ time: 0, grams: 10 }, { time: 50, grams: 5 }], 50)).toBeCloseTo(-0.1);
  });
});

describe('flickVelocity', () => {
  it('ignores slow releases', () => {
    expect(flickVelocity(0.01, 0)).toBe(0);
  });

  it('adds to a spool still spinning the same way, so repeated flicks speed up', () => {
    expect(flickVelocity(0.1, 0.05)).toBeCloseTo(0.15);
    expect(flickVelocity(-0.1, -0.05)).toBeCloseTo(-0.15);
  });

  it('starts fresh when flicking the other way', () => {
    expect(flickVelocity(-0.1, 0.05)).toBeCloseTo(-0.1);
  });

  it('is capped, so it never races through a whole spool', () => {
    expect(flickVelocity(0.25, 0.25)).toBe(MAX_VELOCITY);
    expect(flickVelocity(-0.25, -0.25)).toBe(-MAX_VELOCITY);
  });
});

describe('coastStep', () => {
  it('keeps moving and slows down', () => {
    const first = coastStep({ grams: 100, velocity: 0.2 }, 16);
    expect(first.grams).toBeGreaterThan(100);
    expect(first.velocity).toBeLessThan(0.2);
    expect(first.velocity).toBeGreaterThan(0);
  });

  it('comes to a stop near the expected distance', () => {
    const { coast } = coastUntilStopped({ grams: 0, velocity: 0.1 });
    expect(coast.velocity).toBe(0);
    expect(coast.grams).toBeGreaterThan(coastDistance(0.1) * 0.95);
    expect(coast.grams).toBeLessThanOrEqual(coastDistance(0.1));
  });

  it('gives the same result whatever the frame rate', () => {
    const a = coastStep(coastStep({ grams: 0, velocity: 0.1 }, 8), 8);
    const b = coastStep({ grams: 0, velocity: 0.1 }, 16);
    expect(a.grams).toBeCloseTo(b.grams);
    expect(a.velocity).toBeCloseTo(b.velocity);
  });

  it('stops at 0 g when spinning backwards', () => {
    const { coast } = coastUntilStopped({ grams: 5, velocity: -0.2 });
    expect(coast).toEqual({ grams: 0, velocity: 0 });
  });

  it('stays within a sensible distance even at full speed', () => {
    expect(coastDistance(MAX_VELOCITY)).toBe(MAX_VELOCITY * FRICTION_MS);
    expect(coastDistance(MAX_VELOCITY)).toBeLessThan(200);
  });
});

describe('spinDegrees', () => {
  it('turns once per 100 g', () => {
    expect(spinDegrees(0)).toBe(0);
    expect(spinDegrees(25)).toBe(90);
    expect(spinDegrees(250)).toBe(900);
  });
});
