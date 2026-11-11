import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  dialGrams,
  handleAngle,
  isInDeadZone,
  moveDial,
  pointerAngle,
  startDial,
  stepGrams,
  type DialState,
  type Point,
} from '../../domain/dial';
import { formatGrams } from '../../domain/grams';
import { SpoolGraphic } from '../SpoolGraphic/SpoolGraphic';

const HANDLE_RING_RADIUS = 45;
const HAPTIC_INTERVAL_MS = 40;

interface Drag {
  pointerId: number;
  /** Null until the finger first leaves the dead zone at the centre. */
  state: DialState | null;
  emitted: number;
}

interface GramsDialProps {
  value: number;
  onChange: (grams: number) => void;
  colorHex: string;
  fraction: number;
  label: string;
}

function tick(lastTick: { current: number }): void {
  const time = performance.now();
  if (time - lastTick.current < HAPTIC_INTERVAL_MS) return;
  lastTick.current = time;
  navigator.vibrate?.(2);
}

/** Spin around the spool to set grams. One full turn is 100 g, clockwise adds. */
export function GramsDial({ value, onChange, colorHex, fraction, label }: GramsDialProps) {
  const drag = useRef<Drag | null>(null);
  const lastTick = useRef(0);
  const [rawGrams, setRawGrams] = useState<number | null>(null);

  const measure = (element: HTMLElement): { center: Point; deadZone: number } => {
    const rect = element.getBoundingClientRect();
    return {
      center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      deadZone: rect.width * 0.08,
    };
  };

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const { center, deadZone } = measure(event.currentTarget);
    const point = { x: event.clientX, y: event.clientY };
    if (isInDeadZone(center, point, deadZone)) return;

    const angle = pointerAngle(center, point);
    if (!current.state) {
      current.state = startDial(value, angle);
      return;
    }
    current.state = moveDial(current.state, angle);
    setRawGrams(current.state.rawGrams);

    const grams = dialGrams(current.state);
    if (grams !== current.emitted) {
      current.emitted = grams;
      onChange(grams);
      tick(lastTick);
    }
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointerId: event.pointerId, state: null, emitted: Math.round(value) };
    handlePointer(event);
  };

  const handleEnd = () => {
    drag.current = null;
    setRawGrams(null);
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onChange(stepGrams(value, step));
  };

  const angle = handleAngle(rawGrams ?? value);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuenow={value}
      aria-valuetext={formatGrams(value)}
      onPointerDown={handleDown}
      onPointerMove={handlePointer}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onKeyDown={handleKey}
      className="mx-auto aspect-square w-full max-w-72 cursor-grab touch-none rounded-full select-none"
    >
      <SpoolGraphic colorHex={colorHex} fraction={fraction} className="h-full w-full">
        <circle
          data-testid="dial-handle"
          cx={50 + HANDLE_RING_RADIUS * Math.sin(angle)}
          cy={50 - HANDLE_RING_RADIUS * Math.cos(angle)}
          r="5.5"
          fill="#ffffff"
          stroke="var(--accent)"
          strokeWidth="2"
        />
      </SpoolGraphic>
    </div>
  );
}
