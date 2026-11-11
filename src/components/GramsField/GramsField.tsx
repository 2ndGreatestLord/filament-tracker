import { useEffect, useState } from 'react';
import { parseGramsInput, stepGrams } from '../../domain/dial';

interface GramsFieldProps {
  value: number;
  onChange: (grams: number) => void;
  label: string;
}

const STEP_CLASS =
  'flex h-12 min-w-14 items-center justify-center rounded-full bg-surface-2 font-semibold';

/** Pill-shaped grams input with −10 and +10 buttons. */
export function GramsField({ value, onChange, label }: GramsFieldProps) {
  const [text, setText] = useState(String(value));

  // Follow outside changes (dial, buttons) without disturbing text being typed like "12.".
  useEffect(() => {
    setText((current) => (parseGramsInput(current) === value ? current : String(value)));
  }, [value]);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        className={STEP_CLASS}
        aria-label={`Subtract 10 grams from ${label}`}
        onClick={() => onChange(stepGrams(value, -10))}
      >
        −10
      </button>
      <label className="flex h-12 items-center gap-1 rounded-full border border-line bg-surface px-4">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          aria-label={label}
          className="w-20 bg-transparent text-center text-xl font-semibold text-ink"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onChange(parseGramsInput(event.target.value));
          }}
          onFocus={(event) => event.target.select()}
          onBlur={() => setText(String(value))}
        />
        <span aria-hidden="true" className="text-muted">
          g
        </span>
      </label>
      <button
        type="button"
        className={STEP_CLASS}
        aria-label={`Add 10 grams to ${label}`}
        onClick={() => onChange(stepGrams(value, 10))}
      >
        +10
      </button>
    </div>
  );
}
