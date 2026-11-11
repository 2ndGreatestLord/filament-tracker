import { describe, expect, it } from 'vitest';
import {
  dialGrams,
  handleAngle,
  isInDeadZone,
  moveDial,
  parseGramsInput,
  pointerAngle,
  shortestAngleDelta,
  startDial,
  stepGrams,
  type DialState,
} from './dial';

const TAU = Math.PI * 2;
const center = { x: 100, y: 100 };

/** Rotates the dial in small movements, as a finger would. */
function spin(state: DialState, turns: number, steps = 64 * Math.abs(turns)): DialState {
  let current = state;
  const perStep = (turns * TAU) / steps;
  for (let i = 1; i <= steps; i += 1) {
    const angle = (((state.lastAngle + perStep * i) % TAU) + TAU) % TAU;
    current = moveDial(current, angle);
  }
  return current;
}

describe('pointerAngle', () => {
  it('is 0 at 12 o’clock and grows clockwise', () => {
    expect(pointerAngle(center, { x: 100, y: 0 })).toBeCloseTo(0);
    expect(pointerAngle(center, { x: 200, y: 100 })).toBeCloseTo(TAU / 4);
    expect(pointerAngle(center, { x: 100, y: 200 })).toBeCloseTo(TAU / 2);
    expect(pointerAngle(center, { x: 0, y: 100 })).toBeCloseTo((TAU * 3) / 4);
  });

  it('is never negative', () => {
    expect(pointerAngle(center, { x: 99, y: 0 })).toBeGreaterThan(0);
  });
});

describe('shortestAngleDelta', () => {
  it('is positive for clockwise and negative for counterclockwise', () => {
    expect(shortestAngleDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(shortestAngleDelta(0.5, 0)).toBeCloseTo(-0.5);
  });

  it('crosses 12 o’clock the short way', () => {
    expect(shortestAngleDelta(TAU - 0.1, 0.1)).toBeCloseTo(0.2);
    expect(shortestAngleDelta(0.1, TAU - 0.1)).toBeCloseTo(-0.2);
  });
});

describe('moveDial', () => {
  it('adds 100 g for one clockwise turn', () => {
    expect(dialGrams(spin(startDial(0, 0), 1))).toBe(100);
  });

  it('adds 25 g for a quarter turn', () => {
    expect(dialGrams(spin(startDial(10, 0), 0.25))).toBe(35);
  });

  it('subtracts when turning counterclockwise', () => {
    expect(dialGrams(spin(startDial(150, 0), -1))).toBe(50);
  });

  it('tracks several full turns', () => {
    expect(dialGrams(spin(startDial(0, 0), 3.5))).toBe(350);
  });

  it('starts from wherever the finger first lands, without a jump', () => {
    const state = startDial(40, TAU / 3);
    expect(dialGrams(moveDial(state, TAU / 3))).toBe(40);
  });

  it('moves in 1 g steps', () => {
    const oneGram = TAU / 100;
    expect(dialGrams(moveDial(startDial(0, 0), oneGram))).toBe(1);
    expect(dialGrams(moveDial(startDial(0, 0), oneGram * 0.4))).toBe(0);
  });

  it('never goes below 0', () => {
    expect(spin(startDial(20, 0), -2).rawGrams).toBe(0);
  });

  it('adds again immediately when reversing at 0', () => {
    const atZero = spin(startDial(20, 0), -2);
    expect(dialGrams(spin(atZero, 0.5))).toBe(50);
  });
});

describe('handleAngle', () => {
  it('laps every 100 g', () => {
    expect(handleAngle(0)).toBeCloseTo(0);
    expect(handleAngle(25)).toBeCloseTo(TAU / 4);
    expect(handleAngle(125)).toBeCloseTo(TAU / 4);
  });
});

describe('isInDeadZone', () => {
  it('is true only close to the centre', () => {
    expect(isInDeadZone(center, { x: 103, y: 103 }, 10)).toBe(true);
    expect(isInDeadZone(center, { x: 150, y: 100 }, 10)).toBe(false);
  });
});

describe('stepGrams and parseGramsInput', () => {
  it('steps and stops at 0', () => {
    expect(stepGrams(35, 10)).toBe(45);
    expect(stepGrams(5, -10)).toBe(0);
    expect(stepGrams(0.1, 10)).toBe(10.1);
  });

  it('parses typed text', () => {
    expect(parseGramsInput('42')).toBe(42);
    expect(parseGramsInput('12.5')).toBe(12.5);
    expect(parseGramsInput('12,5')).toBe(12.5);
    expect(parseGramsInput('')).toBe(0);
    expect(parseGramsInput('-3')).toBe(0);
    expect(parseGramsInput('abc')).toBe(0);
  });
});
