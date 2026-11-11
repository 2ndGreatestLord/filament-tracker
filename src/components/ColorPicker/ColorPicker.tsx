import { useId, useState } from 'react';
import { useSavedColors } from '../../db/hooks';
import { deleteSavedColor, restoreSavedColor } from '../../db/repository';
import { COLORS, type FilamentFormValues } from '../../domain/filamentForm';
import {
  MAX_STOPS,
  paintBackground,
  paintDescription,
  paintKey,
  paintStops,
  type Paint,
} from '../../domain/paint';
import type { SavedColor } from '../../domain/types';
import { CloseIcon, PlusIcon } from '../Icons/Icons';
import { SpoolGraphic } from '../SpoolGraphic/SpoolGraphic';
import { useToast } from '../Toast/Toast';

export type ColorValues = Pick<FilamentFormValues, 'colorHex' | 'gradient' | 'shiny' | 'colorName'>;

interface ColorPickerProps {
  value: ColorValues;
  onChange: (patch: Partial<ColorValues>) => void;
  /** The material and finish being saved, so their own colors can be offered. */
  material: string;
  finish: string;
  inputClass: string;
}

const SWATCH =
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-line has-checked:border-accent has-checked:outline-2 has-checked:outline-accent has-focus-visible:outline-2 has-focus-visible:outline-accent';

function Check() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 items-center justify-center rounded-full bg-black font-bold text-white"
    >
      ✓
    </span>
  );
}

export function toPaint(value: ColorValues): Paint {
  return {
    colorHex: value.colorHex,
    colorStops: value.gradient.length > 0 ? [value.colorHex, ...value.gradient] : undefined,
    shiny: value.shiny,
  };
}

/**
 * Picks a filament color. Each material and finish keeps its own saved colors, then come
 * the basic colors, then a custom color that can be a gradient and can be shiny.
 */
export function ColorPicker({ value, onChange, material, finish, inputClass }: ColorPickerProps) {
  const id = useId();
  const toast = useToast();
  const saved = useSavedColors(material, finish) ?? [];
  const [editing, setEditing] = useState(false);

  const current = toPaint(value);
  const currentKey = value.colorHex ? paintKey(current) : '';
  const savedMatch = saved.find((color) => paintKey(color) === currentKey);
  const combo = `${material} · ${finish}`;
  const stopCount = 1 + value.gradient.length;

  const chooseSaved = (color: SavedColor) =>
    onChange({
      colorHex: color.colorHex,
      gradient: paintStops(color).slice(1),
      shiny: color.shiny ?? false,
      colorName: color.name ?? '',
    });

  const removeSaved = async (color: SavedColor) => {
    const removed = await deleteSavedColor(color.id);
    toast(`Removed ${color.name ?? 'color'}`, { undo: () => restoreSavedColor(removed) });
  };

  const addStop = () =>
    onChange({ gradient: [...value.gradient, value.colorHex === '#ffffff' ? '#000000' : '#ffffff'] });

  return (
    <div className="flex flex-col gap-4">
      {material && finish ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Your {combo} colors</h3>
            {saved.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing((on) => !on)}
                className="min-h-11 px-2 text-sm font-semibold text-accent"
              >
                {editing ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
          {saved.length === 0 ? (
            <p className="text-sm text-muted">
              Colors you save for {combo} are kept here, separate from every other material and
              finish.
            </p>
          ) : (
            <div role="radiogroup" aria-label={`Your ${combo} colors`} className="flex flex-wrap gap-3">
              {saved.map((color) => {
                const description = paintDescription(color, color.name);
                return (
                  <div key={color.id} className="relative flex w-14 flex-col items-center gap-1">
                    <label title={description} className={SWATCH} style={{ background: paintBackground(color) }}>
                      <input
                        type="radio"
                        name={`${id}-saved`}
                        aria-label={description}
                        checked={savedMatch?.id === color.id}
                        onChange={() => chooseSaved(color)}
                        className="sr-only"
                      />
                      {savedMatch?.id === color.id && <Check />}
                    </label>
                    <span className="w-full truncate text-center text-xs text-muted">
                      {color.name ?? 'Custom'}
                    </span>
                    {editing && (
                      <button
                        type="button"
                        aria-label={`Remove ${description}`}
                        onClick={() => void removeSaved(color)}
                        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-2"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Choose a material and finish to see the colors you’ve saved for them.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Basic colors</h3>
        <div role="radiogroup" aria-label="Basic colors" className="flex flex-wrap gap-2">
          {COLORS.map((color) => {
            const checked = !savedMatch && value.gradient.length === 0 && value.colorHex === color.hex;
            return (
              <label key={color.hex} title={color.name} className={SWATCH} style={{ backgroundColor: color.hex }}>
                <input
                  type="radio"
                  name={`${id}-basic`}
                  aria-label={color.name}
                  checked={checked}
                  onChange={() => onChange({ colorHex: color.hex, gradient: [], colorName: '' })}
                  className="sr-only"
                />
                {checked && <Check />}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Custom, gradient, or shiny</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            aria-label="Custom color"
            value={value.colorHex || '#888888'}
            onChange={(event) => onChange({ colorHex: event.target.value })}
            className="h-11 w-11 cursor-pointer rounded-lg border border-line bg-transparent"
          />
          {value.gradient.map((stop, index) => (
            <span key={index} className="flex items-center">
              <span aria-hidden="true" className="px-0.5 text-muted">
                →
              </span>
              <input
                type="color"
                aria-label={`Gradient color ${index + 2}`}
                value={stop}
                onChange={(event) =>
                  onChange({
                    gradient: value.gradient.map((old, i) => (i === index ? event.target.value : old)),
                  })
                }
                className="h-11 w-11 cursor-pointer rounded-lg border border-line bg-transparent"
              />
              <button
                type="button"
                aria-label={`Remove gradient color ${index + 2}`}
                onClick={() => onChange({ gradient: value.gradient.filter((_, i) => i !== index) })}
                className="flex h-11 w-8 items-center justify-center text-muted"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
          {stopCount < MAX_STOPS && (
            <button
              type="button"
              disabled={!value.colorHex}
              aria-label="Add gradient color"
              onClick={addStop}
              className="flex min-h-11 items-center gap-1 rounded-full border border-line px-3 text-sm disabled:opacity-40"
            >
              <PlusIcon className="h-4 w-4" />
              Gradient color
            </button>
          )}
          <label className="flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm has-checked:border-accent has-checked:bg-accent has-checked:font-semibold has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-accent">
            <input
              type="checkbox"
              checked={value.shiny}
              onChange={(event) => onChange({ shiny: event.target.checked })}
              className="sr-only"
            />
            ✨ Shiny
          </label>
        </div>

        <div className="flex items-center gap-3">
          {value.colorHex && (
            <SpoolGraphic
              paint={current}
              fraction={1}
              title={`Preview: ${paintDescription(current, value.colorName.trim() || undefined)}`}
              className="h-16 w-16 shrink-0"
            />
          )}
          <input
            aria-label="Color name (optional)"
            placeholder="Color name (optional)"
            className={inputClass}
            value={value.colorName}
            onChange={(event) => onChange({ colorName: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
