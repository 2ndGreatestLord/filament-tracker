import { GRAMS_PER_TURN } from './dial';

/** How quickly a flicked spool slows down. Like iOS scrolling, it decays exponentially. */
export const FRICTION_MS = 450;
/** The fastest a spool can spin, in grams per millisecond (3 turns a second). */
export const MAX_VELOCITY = 0.3;
/** A release slower than this is a placement, not a flick. */
export const MIN_FLICK_VELOCITY = 0.02;
/** Below this the spool counts as stopped. */
export const STOP_VELOCITY = 0.004;
/** Only the last part of a drag decides the flick speed. */
export const SAMPLE_WINDOW_MS = 80;
/** A finger that paused this long before lifting doesn't flick. */
export const STALE_MS = 60;

export interface Sample {
  time: number;
  grams: number;
}

export interface Coast {
  grams: number;
  /** Grams per millisecond. Positive is clockwise. */
  velocity: number;
}

/** The speed of the drag as the finger lifts, in grams per millisecond. */
export function releaseVelocity(samples: readonly Sample[], now: number): number {
  const last = samples[samples.length - 1];
  if (!last || now - last.time > STALE_MS) return 0;
  const recent = samples.filter((sample) => last.time - sample.time <= SAMPLE_WINDOW_MS);
  const first = recent[0];
  if (!first || last.time === first.time) return 0;
  return (last.grams - first.grams) / (last.time - first.time);
}

/**
 * The starting speed of a flick. Flicking again in the same direction while the spool is
 * still spinning adds to its speed, so repeated flicks speed it up, up to a cap.
 */
export function flickVelocity(release: number, carried: number): number {
  if (Math.abs(release) < MIN_FLICK_VELOCITY) return 0;
  const sameDirection = Math.sign(release) === Math.sign(carried);
  const velocity = sameDirection ? release + carried : release;
  return Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
}

/** Advances a spinning spool by `dtMs`. It slows smoothly, stops, and never goes below 0 g. */
export function coastStep(coast: Coast, dtMs: number): Coast {
  const decay = Math.exp(-dtMs / FRICTION_MS);
  const grams = coast.grams + coast.velocity * FRICTION_MS * (1 - decay);
  if (grams <= 0) return { grams: 0, velocity: 0 };
  const velocity = coast.velocity * decay;
  return { grams, velocity: Math.abs(velocity) < STOP_VELOCITY ? 0 : velocity };
}

/** How far a flick will carry the spool once it stops, in grams. */
export function coastDistance(velocity: number): number {
  return velocity * FRICTION_MS;
}

/** The spool turns one full revolution every 100 g, so it spins with the finger. */
export function spinDegrees(grams: number): number {
  return (grams / GRAMS_PER_TURN) * 360;
}
