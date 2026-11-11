import { useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { sampleColor, toPixel, type Pixels, type Point } from '../../domain/eyedropper';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import { Button } from '../Button/Button';
import { CameraIcon } from '../Icons/Icons';
import { useObjectUrl } from '../PhotoPicker/useObjectUrl';
import { useToast } from '../Toast/Toast';
import { loadPhotoPixels } from './loadPhotoPixels';

interface PhotoEyedropperProps {
  /** Called with the picked color. `asGradient` is true for "Add as gradient color". */
  onPick: (hex: string, asGradient: boolean) => void;
  /** Whether "Add as gradient color" is offered. */
  canAddToGradient: boolean;
}

interface Loaded {
  file: Blob;
  pixels: Pixels;
}

const PICKER_BUTTON =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent';

/** Arrow keys move the sampling point by this fraction of the photo. */
const KEY_STEP = 0.02;

/**
 * Takes or chooses a photo of a filament roll, then picks its color like an eyedropper:
 * tap or drag on the photo, and the color around that spot is used.
 */
export function PhotoEyedropper({ onPick, canAddToGradient }: PhotoEyedropperProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [point, setPoint] = useState<Point>({ x: 0, y: 0 });
  const dragging = useRef<number | null>(null);
  const url = useObjectUrl(loaded?.file);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const pixels = await loadPhotoPixels(file);
      setPoint({ x: Math.floor(pixels.width / 2), y: Math.floor(pixels.height / 2) });
      setLoaded({ file, pixels });
    } catch {
      toast('Couldn’t read that photo');
    } finally {
      setBusy(false);
      input.value = '';
    }
  };

  const close = () => setLoaded(null);
  const color = loaded ? sampleColor(loaded.pixels, point.x, point.y) : null;

  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    if (!loaded) return;
    const box = event.currentTarget.getBoundingClientRect();
    setPoint(toPixel({ x: event.clientX, y: event.clientY }, box, loaded.pixels));
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!loaded) return;
    const { width, height } = loaded.pixels;
    const dx = { ArrowLeft: -1, ArrowRight: 1 }[event.key] ?? 0;
    const dy = { ArrowUp: -1, ArrowDown: 1 }[event.key] ?? 0;
    if (!dx && !dy) return;
    event.preventDefault();
    setPoint((current) => ({
      x: Math.min(width - 1, Math.max(0, current.x + Math.round(dx * KEY_STEP * width))),
      y: Math.min(height - 1, Math.max(0, current.y + Math.round(dy * KEY_STEP * height))),
    }));
  };

  const use = (asGradient: boolean) => {
    if (!color) return;
    onPick(color, asGradient);
    close();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <label className={PICKER_BUTTON}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Pick color from a photo"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void handleFile(event)}
          />
          <CameraIcon className="h-5 w-5" />
          {busy ? 'Reading photo…' : 'Pick from photo'}
        </label>
        <label className="flex min-h-11 cursor-pointer items-center px-1 text-sm font-semibold text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent">
          <input
            type="file"
            accept="image/*"
            aria-label="Pick color from a library photo"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void handleFile(event)}
          />
          or use a saved photo
        </label>
      </div>

      {loaded && (
        <BottomSheet title="Pick a color from the photo" onClose={close}>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <p className="text-sm text-muted">
              Tap or drag on the filament. The color is read from the area around the circle, so
              glints and shadows don’t throw it off.
            </p>
            <div
              role="img"
              aria-label={`Photo. The circle is on ${color ?? 'no color'}. Use the arrow keys to move it.`}
              tabIndex={0}
              onKeyDown={handleKey}
              onPointerDown={(event) => {
                dragging.current = event.pointerId;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                moveTo(event);
              }}
              onPointerMove={(event) => {
                if (dragging.current === event.pointerId) moveTo(event);
              }}
              onPointerUp={() => (dragging.current = null)}
              onPointerCancel={() => (dragging.current = null)}
              className="relative mx-auto w-full max-w-md cursor-crosshair touch-none select-none overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-accent"
              style={{ aspectRatio: `${loaded.pixels.width} / ${loaded.pixels.height}` }}
            >
              {url && (
                <img src={url} alt="" draggable={false} className="pointer-events-none h-full w-full" />
              )}
              <span
                aria-hidden="true"
                data-testid="eyedropper-marker"
                className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.6)]"
                style={{
                  left: `${((point.x + 0.5) / loaded.pixels.width) * 100}%`,
                  top: `${((point.y + 0.5) / loaded.pixels.height) * 100}%`,
                  background: color ?? 'transparent',
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-12 w-12 shrink-0 rounded-full border-2 border-line"
                style={{ background: color ?? 'transparent' }}
              />
              <span className="font-mono text-lg" aria-live="polite">
                {color ?? 'No color here'}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Button disabled={!color} onClick={() => use(false)}>
                Use this color
              </Button>
              {canAddToGradient && (
                <Button variant="secondary" disabled={!color} onClick={() => use(true)}>
                  Add as gradient color
                </Button>
              )}
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
