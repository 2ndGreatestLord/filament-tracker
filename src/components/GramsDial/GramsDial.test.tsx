import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { GramsDial } from './GramsDial';

function Harness({ start = 0, onValue }: { start?: number; onValue?: (grams: number) => void }) {
  const [value, setValue] = useState(start);
  return (
    <GramsDial
      value={value}
      onChange={(grams) => {
        setValue(grams);
        onValue?.(grams);
      }}
      colorHex="#ff0000"
      fraction={0.5}
      label="Grams dial"
    />
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

/** Drags around a circle in small movements, starting at 12 o'clock. */
function drag(dial: HTMLElement, turns: number) {
  const point = (t: number) => ({
    clientX: 100 + 90 * Math.sin(t * Math.PI * 2),
    clientY: 100 - 90 * Math.cos(t * Math.PI * 2),
    pointerId: 1,
  });
  fireEvent.pointerDown(dial, point(0));
  const steps = Math.ceil(Math.abs(turns) * 40);
  for (let i = 1; i <= steps; i += 1) {
    fireEvent.pointerMove(dial, point((turns * i) / steps));
  }
  fireEvent.pointerUp(dial, point(turns));
}

describe('GramsDial', () => {
  it('adds 25 g for a clockwise quarter turn', () => {
    const dial = setup();
    drag(dial, 0.25);
    expect(dial).toHaveAttribute('aria-valuenow', '25');
  });

  it('tracks multiple full turns', () => {
    const dial = setup();
    drag(dial, 2.5);
    expect(dial).toHaveAttribute('aria-valuenow', '250');
  });

  it('subtracts when dragging counterclockwise', () => {
    const dial = setup(100);
    drag(dial, -0.5);
    expect(dial).toHaveAttribute('aria-valuenow', '50');
  });

  it('never goes below 0', () => {
    const dial = setup(10);
    drag(dial, -1);
    expect(dial).toHaveAttribute('aria-valuenow', '0');
  });

  it('does nothing when the pointer moves without being pressed', () => {
    const dial = setup(10);
    fireEvent.pointerMove(dial, { clientX: 190, clientY: 100, pointerId: 1 });
    expect(dial).toHaveAttribute('aria-valuenow', '10');
  });

  it('ignores movement at the centre', () => {
    const dial = setup(10);
    fireEvent.pointerDown(dial, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(dial, { clientX: 101, clientY: 101, pointerId: 1 });
    fireEvent.pointerMove(dial, { clientX: 99, clientY: 99, pointerId: 1 });
    expect(dial).toHaveAttribute('aria-valuenow', '10');
  });

  it('moves the handle around the ring', () => {
    const dial = setup();
    drag(dial, 0.25);
    const handle = screen.getByTestId('dial-handle');
    expect(Number(handle.getAttribute('cx'))).toBeCloseTo(95);
    expect(Number(handle.getAttribute('cy'))).toBeCloseTo(50);
  });

  it('works from the keyboard', () => {
    const dial = setup(5);
    fireEvent.keyDown(dial, { key: 'ArrowUp' });
    expect(dial).toHaveAttribute('aria-valuenow', '6');
    fireEvent.keyDown(dial, { key: 'PageDown' });
    expect(dial).toHaveAttribute('aria-valuenow', '0');
  });

  it('gives a haptic tick where supported', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const dial = setup();
    drag(dial, 0.25);
    expect(vibrate).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
