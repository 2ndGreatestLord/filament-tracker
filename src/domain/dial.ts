export const GRAMS_PER_TURN = 100;

const TAU = Math.PI * 2;

export interface Point {
  x: number;
  y: number;
}

export interface DialState {
  /** Unrounded grams, so the dial follows the finger between 1 g steps. */
  rawGrams: number;
  /** Last pointer angle in radians. */
  lastAngle: number;
}

/** Pointer angle around the centre in radians: 0 at 12 o'clock, growing clockwise, in [0, 2π). */
export function pointerAngle(center: Point, point: Point): number {
  const angle = Math.atan2(point.x - center.x, center.y - point.y);
  return angle < 0 ? angle + TAU : angle;
}

/** Shortest signed rotation between two angles, in (-π, π]. Positive is clockwise. */
export function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta <= -Math.PI) delta += TAU;
  return delta;
}

export function startDial(grams: number, angle: number): DialState {
  return { rawGrams: grams, lastAngle: angle };
}

/**
 * Advances the dial to a new pointer angle. Applied one small movement at a time, so
 * rotation accumulates across full turns. At 0 g the extra rotation is discarded, so
 * turning back clockwise adds grams straight away.
 */
export function moveDial(state: DialState, angle: number): DialState {
  const delta = shortestAngleDelta(state.lastAngle, angle);
  return {
    rawGrams: Math.max(0, state.rawGrams + (delta / TAU) * GRAMS_PER_TURN),
    lastAngle: angle,
  };
}

/** The dial's value in whole grams. */
export function dialGrams(state: DialState): number {
  return Math.round(state.rawGrams);
}

/** Where the handle sits on the ring for a gram value: one lap every 100 g. */
export function handleAngle(grams: number): number {
  return ((grams % GRAMS_PER_TURN) / GRAMS_PER_TURN) * TAU;
}

/** Angles are meaningless right at the centre, so movement there is ignored. */
export function isInDeadZone(center: Point, point: Point, radius: number): boolean {
  return Math.hypot(point.x - center.x, point.y - center.y) < radius;
}

/** Applies a −10/+10 style step. Never below 0. */
export function stepGrams(grams: number, step: number): number {
  return Math.max(0, Math.round((grams + step) * 100) / 100);
}

/** Text from the grams input to a number. Blank, negative, or invalid text counts as 0. */
export function parseGramsInput(text: string): number {
  const value = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}
