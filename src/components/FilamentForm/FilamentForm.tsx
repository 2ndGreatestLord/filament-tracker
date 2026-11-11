import { useId, useState, type FormEvent, type ReactNode } from 'react';
import {
  COLORS,
  EMPTY_FILAMENT_FORM,
  FINISHES,
  filamentFormToFields,
  MATERIALS,
  newSpoolGrams,
  OTHER,
  validateFilamentForm,
  type FilamentFields,
  type FilamentFormErrors,
  type FilamentFormValues,
} from '../../domain/filamentForm';
import { Button } from '../Button/Button';

export const INPUT_CLASS =
  'min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink';

function Section({ title, error, children }: { title: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 font-semibold">{title}</legend>
      {children}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface ChipsProps {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function Chips({ name, options, value, onChange }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 has-checked:border-accent has-checked:bg-accent has-checked:font-semibold has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

const asOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

interface FilamentFormProps {
  initial?: FilamentFormValues;
  submitLabel?: string;
  onSubmit: (fields: FilamentFields) => Promise<void>;
}

export function FilamentForm({ initial, submitLabel = 'Save', onSubmit }: FilamentFormProps) {
  const id = useId();
  const [values, setValues] = useState(initial ?? EMPTY_FILAMENT_FORM);
  const [errors, setErrors] = useState<FilamentFormErrors>({});
  const [showMore, setShowMore] = useState(
    Boolean(initial && (initial.brand || initial.price || initial.spoolSize)),
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FilamentFormValues>(key: K, value: FilamentFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const isPreset = COLORS.some((color) => color.hex === values.colorHex);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateFilamentForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.price || found.spoolSize) setShowMore(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(filamentFormToFields(values));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6 px-4 pt-2">
      <Section title="Material" error={errors.material}>
        <Chips
          name={`${id}-material`}
          options={asOptions(MATERIALS)}
          value={values.material}
          onChange={(value) => set('material', value)}
        />
        {values.material === OTHER && (
          <input
            aria-label="Material name"
            className={`${INPUT_CLASS} mt-2`}
            value={values.materialOther}
            onChange={(event) => set('materialOther', event.target.value)}
          />
        )}
      </Section>

      <Section title="Finish" error={errors.finish}>
        <Chips
          name={`${id}-finish`}
          options={asOptions(FINISHES)}
          value={values.finish}
          onChange={(value) => set('finish', value)}
        />
        {values.finish === OTHER && (
          <input
            aria-label="Finish name"
            className={`${INPUT_CLASS} mt-2`}
            value={values.finishOther}
            onChange={(event) => set('finishOther', event.target.value)}
          />
        )}
      </Section>

      <Section title="Color" error={errors.color}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <label
              key={color.hex}
              title={color.name}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-line has-checked:border-accent has-checked:outline-2 has-checked:outline-accent has-focus-visible:outline-2 has-focus-visible:outline-accent"
              style={{ backgroundColor: color.hex }}
            >
              <input
                type="radio"
                name={`${id}-color`}
                aria-label={color.name}
                checked={values.colorHex === color.hex}
                onChange={() => set('colorHex', color.hex)}
                className="sr-only"
              />
              {values.colorHex === color.hex && (
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black font-bold text-white"
                >
                  ✓
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="color"
              aria-label="Custom color"
              value={values.colorHex || '#888888'}
              onChange={(event) => set('colorHex', event.target.value)}
              className="h-11 w-11 cursor-pointer rounded-lg border border-line bg-transparent"
            />
            <span className="whitespace-nowrap text-sm">
              Custom{values.colorHex && !isPreset ? ' ✓' : ''}
            </span>
          </label>
          <input
            aria-label="Color name (optional)"
            placeholder="Color name (optional)"
            className={INPUT_CLASS}
            value={values.colorName}
            onChange={(event) => set('colorName', event.target.value)}
          />
        </div>
      </Section>

      <Section title="Amount" error={errors.amount}>
        <Chips
          name={`${id}-amount`}
          options={[
            {
              value: 'new',
              label: `New (${newSpoolGrams(values.spoolSize).toLocaleString('en-US')} g)`,
            },
            { value: 'set', label: 'Set…' },
          ]}
          value={values.amountMode}
          onChange={(value) => set('amountMode', value === 'set' ? 'set' : 'new')}
        />
        {values.amountMode === 'set' && (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            aria-label="Grams on spool"
            placeholder="Grams on spool"
            className={`${INPUT_CLASS} mt-2`}
            value={values.setGrams}
            onChange={(event) => set('setGrams', event.target.value)}
          />
        )}
      </Section>

      <div>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((open) => !open)}
          className="min-h-11 font-semibold text-accent"
        >
          More details {showMore ? '▴' : '▾'}
        </button>
        {showMore && (
          <div className="mt-2 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-sm">Brand</span>
              <input
                className={INPUT_CLASS}
                value={values.brand}
                onChange={(event) => set('brand', event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Price paid</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                className={INPUT_CLASS}
                value={values.price}
                onChange={(event) => set('price', event.target.value)}
              />
              {errors.price && (
                <span role="alert" className="mt-1 block text-sm font-medium text-danger">
                  {errors.price}
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">Full spool size (g)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="1000"
                className={INPUT_CLASS}
                value={values.spoolSize}
                onChange={(event) => set('spoolSize', event.target.value)}
              />
              {errors.spoolSize && (
                <span role="alert" className="mt-1 block text-sm font-medium text-danger">
                  {errors.spoolSize}
                </span>
              )}
            </label>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 bg-bg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" className="w-full" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
