import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GramsDial } from './GramsDial';

function Harness({ start = 0 }: { start?: number }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <GramsDial
        value={value}
        onChange={setValue}
        paint={{ colorHex: '#ff0000' }}
        fraction={0.5}
        label="Grams dial"
      />
      <button type="button" onClick={() => setValue(500)}>
        Type 500
      </button>
    </>
  );
}

function setup(start = 0) {
  render(<Harness start={start} />);
  const dial = screen.getByRole('slider', { name: 'Grams dial' });
  vi.spyOn(dial, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 200,
    bottom: 200,
    width: 200,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return dial;
}

const at = (t: number) => ({
  clientX: 100 + 90 * Math.sin(t * Math.PI * 2),
  clientY: 100 - 90 * Math.cos(t * Math.PI * 2),
  pointerId: 1,
});

/**
 * Drags from `from` turns to `from + turns`, taking `ms` milliseconds. Fast drags flick.
 * `pauseMs` holds the finger still before lifting it.
 */
function drag(dial: HTMLElement, turns: number, ms: number, { from = 0, pauseMs = 0 } = {}) {
  const steps = Math.max(4, Math.ceil(Math.abs(turns) * 40));
  fireEvent.pointerDown(dial, at(from));
  for (let i = 1; i <= steps; i += 1) {
    act(() => void vi.advanceTimersByTime(ms / steps));
    fireEvent.pointerMove(dial, at(from + (turns * i) / steps));
  }
  if (pauseMs) act(() => void vi.advanceTimersByTime(pauseMs));
  fireEvent.pointerUp(dial, at(from + turns));
}

const grams = (dial: HTMLElement) => Number(dial.getAttribute('aria-valuenow'));
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('GramsDial: dragging', () => {
  it('adds 25 g for a slow clockwise quarter turn, and stops there', () => {
    const dial = setup();
    drag(dial, 0.25, 2000, { pauseMs: 100 });
    expect(grams(dial)).toBe(25);
    wait(2000);
    expect(grams(dial)).toBe(25);
  });

  it('tracks multiple full turns', () => {
    const dial = setup();
    drag(dial, 2.5, 10_000, { pauseMs: 100 });
    expect(grams(dial)).toBe(250);
  });

  it('subtracts when dragging counterclockwise', () => {
    const dial = setup(100);
    drag(dial, -0.5, 3000, { pauseMs: 100 });
    expect(grams(dial)).toBe(50);
  });

  it('never goes below 0', () => {
    const dial = setup(10);
    drag(dial, -1, 3000, { pauseMs: 100 });
    expect(grams(dial)).toBe(0);
  });

  it('does nothing when the pointer moves without being pressed', () => {
    const dial = setup(10);
    fireEvent.pointerMove(dial, { clientX: 190, clientY: 100, pointerId: 1 });
    expect(grams(dial)).toBe(10);
  });

  it('ignores movement at the centre', () => {
    const dial = setup(10);
    fireEvent.pointerDown(dial, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(dial, { clientX: 101, clientY: 101, pointerId: 1 });
    fireEvent.pointerMove(dial, { clientX: 99, clientY: 99, pointerId: 1 });
    expect(grams(dial)).toBe(10);
  });

  it('has no dial handle, and the spool itself turns with the grams', () => {
    const dial = setup();
    expect(screen.queryByTestId('dial-handle')).toBeNull();
    drag(dial, 0.25, 2000, { pauseMs: 100 });
    expect(dial.querySelector('svg')).toHaveAttribute('data-rotation', '90');
  });
});

describe('GramsDial: flicking', () => {
  it('keeps spinning after a flick, slows down, and stops', () => {
    const dial = setup();
    drag(dial, 0.25, 100);
    const released = grams(dial);
    expect(released).toBe(25);

    wait(100);
    const coasting = grams(dial);
    expect(coasting).toBeGreaterThan(released);

    wait(5000);
    const stopped = grams(dial);
    expect(stopped).toBeGreaterThan(coasting);
    wait(2000);
    expect(grams(dial)).toBe(stopped);
  });

  it('goes further with each flick made while it is still spinning', () => {
    const one = setup();
    drag(one, 0.2, 100);
    wait(10_000);
    const single = grams(one);
    cleanup();

    const two = setup();
    drag(two, 0.2, 100);
    wait(50);
    const start = grams(two);
    drag(two, 0.2, 100, { from: start / 100 });
    wait(10_000);
    const extraFromSecond = grams(two) - start;

    expect(extraFromSecond).toBeGreaterThan(single);
  });

  it('stays within a sensible range, even with hard flicks', () => {
    const dial = setup();
    for (let i = 0; i < 5; i += 1) {
      drag(dial, 1, 50, { from: grams(dial) / 100 });
      wait(30);
    }
    wait(10_000);
    expect(grams(dial)).toBeLessThan(1000);
  });

  it('stops when touched', () => {
    const dial = setup();
    drag(dial, 0.25, 100);
    wait(50);
    fireEvent.pointerDown(dial, at(0.5));
    const held = grams(dial);
    wait(2000);
    expect(grams(dial)).toBe(held);
    fireEvent.pointerUp(dial, at(0.5));
  });

  it('stops spinning at 0 g when flicked backwards', () => {
    const dial = setup(20);
    drag(dial, -0.15, 60);
    wait(10_000);
    expect(grams(dial)).toBe(0);
  });

  it('gives way to typing', () => {
    const dial = setup();
    drag(dial, 0.25, 100);
    wait(50);
    fireEvent.click(screen.getByRole('button', { name: 'Type 500' }));
    wait(3000);
    expect(grams(dial)).toBe(500);
  });

  it('gives a haptic tick where supported', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const dial = setup();
    drag(dial, 0.25, 2000);
    expect(vibrate).toHaveBeenCalled();
  });
});

describe('GramsDial: keyboard', () => {
  it('steps by 1 and 10', () => {
    const dial = setup(5);
    fireEvent.keyDown(dial, { key: 'ArrowUp' });
    expect(grams(dial)).toBe(6);
    fireEvent.keyDown(dial, { key: 'PageDown' });
    expect(grams(dial)).toBe(0);
  });
});
