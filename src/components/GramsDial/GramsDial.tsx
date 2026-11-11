import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  isInDeadZone,
  moveDial,
  pointerAngle,
  startDial,
  stepGrams,
  type DialState,
  type Point,
} from '../../domain/dial';
import { formatGrams } from '../../domain/grams';
import {
  coastStep,
  flickVelocity,
  releaseVelocity,
  spinDegrees,
  type Sample,
} from '../../domain/momentum';
import type { Paint } from '../../domain/paint';
import { SpoolGraphic } from '../SpoolGraphic/SpoolGraphic';

const HAPTIC_INTERVAL_MS = 40;
const SAMPLE_KEEP_MS = 200;
/** Long frame gaps (a hidden tab, a slow phone) are treated as one normal frame. */
const MAX_FRAME_MS = 64;

interface Drag {
  pointerId: number;
  /** Null until the finger first leaves the dead zone at the centre. */
  state: DialState | null;
  /** Where the spool was when grabbed. Mid-spin this is between whole grams. */
  base: number;
  emitted: number;
  samples: Sample[];
  /** Speed the spool still had when grabbed, so repeated flicks build up. */
  carried: number;
}

interface Spin {
  grams: number;
  velocity: number;
  lastTime: number;
  emitted: number;
  frame: number;
}

interface GramsDialProps {
  value: number;
  onChange: (grams: number) => void;
  paint: Paint;
  fraction: number;
  label: string;
}

/**
 * Swipe around the spool to set grams, like scrolling on a phone. Clockwise adds, one
 * full turn is 100 g. A flick keeps it spinning and slowing, and flicking again while it
 * spins makes it faster. Touching it stops it. The spool turns as the grams change.
 */
export function GramsDial({ value, onChange, paint, fraction, label }: GramsDialProps) {
  const drag = useRef<Drag | null>(null);
  const spin = useRef<Spin | null>(null);
  const lastTick = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [rawGrams, setRawGrams] = useState<number | null>(null);

  const tick = () => {
    const time = performance.now();
    if (time - lastTick.current < HAPTIC_INTERVAL_MS) return;
    lastTick.current = time;
    navigator.vibrate?.(2);
  };

  /** Stops a spinning spool and reports where it was and how fast it was going. */
  const stopSpin = (): { grams: number; velocity: number } | null => {
    const current = spin.current;
    if (!current) return null;
    cancelAnimationFrame(current.frame);
    spin.current = null;
    return { grams: current.grams, velocity: current.velocity };
  };

  useEffect(() => () => void stopSpin(), []);

  // Typing or the ±10 buttons take over from a spinning spool.
  useEffect(() => {
    if (spin.current && value !== spin.current.emitted) {
      stopSpin();
      setRawGrams(null);
    }
  }, [value]);

  const frame = () => {
    const current = spin.current;
    if (!current) return;
    const time = performance.now();
    const next = coastStep(current, Math.min(MAX_FRAME_MS, time - current.lastTime));
    current.grams = next.grams;
    current.velocity = next.velocity;
    current.lastTime = time;
    setRawGrams(next.grams);

    const grams = Math.round(next.grams);
    if (grams !== current.emitted) {
      current.emitted = grams;
      onChangeRef.current(grams);
      tick();
    }
    if (next.velocity === 0) {
      spin.current = null;
      setRawGrams(null);
      return;
    }
    current.frame = requestAnimationFrame(frame);
  };

  const measure = (element: HTMLElement): { center: Point; deadZone: number } => {
    const rect = element.getBoundingClientRect();
    return {
      center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      deadZone: rect.width * 0.08,
    };
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const { center, deadZone } = measure(event.currentTarget);
    const point = { x: event.clientX, y: event.clientY };
    if (isInDeadZone(center, point, deadZone)) return;

    const angle = pointerAngle(center, point);
    const time = performance.now();
    if (!current.state) {
      current.state = startDial(current.base, angle);
      current.samples = [{ time, grams: current.base }];
      return;
    }
    current.state = moveDial(current.state, angle);
    current.samples = [
      ...current.samples.filter((sample) => time - sample.time <= SAMPLE_KEEP_MS),
      { time, grams: current.state.rawGrams },
    ];
    setRawGrams(current.state.rawGrams);

    const grams = Math.round(current.state.rawGrams);
    if (grams !== current.emitted) {
      current.emitted = grams;
      onChange(grams);
      tick();
    }
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const stopped = stopSpin();
    drag.current = {
      pointerId: event.pointerId,
      state: null,
      base: stopped?.grams ?? value,
      emitted: Math.round(stopped?.grams ?? value),
      samples: [],
      carried: stopped?.velocity ?? 0,
    };
    handleMove(event);
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    const now = performance.now();
    const velocity = current.state
      ? flickVelocity(releaseVelocity(current.samples, now), current.carried)
      : 0;
    if (velocity === 0 || !current.state) {
      setRawGrams(null);
      return;
    }
    spin.current = {
      grams: current.state.rawGrams,
      velocity,
      lastTime: now,
      emitted: current.emitted,
      frame: requestAnimationFrame(frame),
    };
  };

  const handleCancel = () => {
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
    stopSpin();
    setRawGrams(null);
    onChange(stepGrams(value, step));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuenow={value}
      aria-valuetext={formatGrams(value)}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
      onKeyDown={handleKey}
      className="mx-auto aspect-square w-full max-w-72 cursor-grab touch-none rounded-full select-none"
    >
      <SpoolGraphic
        paint={paint}
        fraction={fraction}
        rotation={spinDegrees(rawGrams ?? value)}
        className="h-full w-full"
      />
    </div>
  );
}
