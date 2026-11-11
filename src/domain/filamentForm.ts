import { DEFAULT_SPOOL_GRAMS } from './grams';

export const OTHER = 'Other';
export const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', OTHER] as const;
export const FINISHES = [
  'Basic',
  'Matte',
  'Silk',
  'Multicolor',
  'Wood',
  'Glow',
  'Carbon Fiber',
  OTHER,
] as const;

export const COLORS = [
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Black', hex: '#1c1c1e' },
  { name: 'Gray', hex: '#8e8e93' },
  { name: 'Silver', hex: '#c7c9cc' },
  { name: 'Red', hex: '#d32f2f' },
  { name: 'Orange', hex: '#f57c00' },
  { name: 'Yellow', hex: '#fdd835' },
  { name: 'Lime', hex: '#9ccc33' },
  { name: 'Green', hex: '#2e8b3d' },
  { name: 'Teal', hex: '#00897b' },
  { name: 'Light Blue', hex: '#4fc3f7' },
  { name: 'Blue', hex: '#1e5fd0' },
  { name: 'Purple', hex: '#7b3fb5' },
  { name: 'Pink', hex: '#f06fa8' },
  { name: 'Brown', hex: '#795032' },
  { name: 'Beige', hex: '#d9c3a0' },
] as const;

export interface FilamentFormValues {
  material: string;
  materialOther: string;
  finish: string;
  finishOther: string;
  colorHex: string;
  colorName: string;
  amountMode: 'new' | 'set';
  setGrams: string;
  brand: string;
  price: string;
  spoolSize: string;
}

export type FilamentFormErrors = Partial<
  Record<'material' | 'finish' | 'color' | 'amount' | 'price' | 'spoolSize', string>
>;

export interface FilamentFields {
  material: string;
  finish: string;
  colorHex: string;
  colorName?: string;
  startGrams: number;
  brand?: string;
  price?: number;
  spoolSizeGrams?: number;
}

export const EMPTY_FILAMENT_FORM: FilamentFormValues = {
  material: '',
  materialOther: '',
  finish: '',
  finishOther: '',
  colorHex: '',
  colorName: '',
  amountMode: 'new',
  setGrams: '',
  brand: '',
  price: '',
  spoolSize: '',
};

function parseOptional(text: string): number | undefined {
  return text.trim() === '' ? undefined : Number(text);
}

/** The grams a "New" spool starts with: a full spool of the given size. */
export function newSpoolGrams(spoolSize: string): number {
  const size = parseOptional(spoolSize);
  return size !== undefined && Number.isFinite(size) && size > 0 ? size : DEFAULT_SPOOL_GRAMS;
}

export function validateFilamentForm(values: FilamentFormValues): FilamentFormErrors {
  const errors: FilamentFormErrors = {};

  if (!values.material) errors.material = 'Choose a material.';
  else if (values.material === OTHER && !values.materialOther.trim())
    errors.material = 'Type the material.';

  if (!values.finish) errors.finish = 'Choose a finish.';
  else if (values.finish === OTHER && !values.finishOther.trim())
    errors.finish = 'Type the finish.';

  if (!values.colorHex) errors.color = 'Choose a color.';

  const size = parseOptional(values.spoolSize);
  if (size !== undefined && !(Number.isFinite(size) && size > 0))
    errors.spoolSize = 'Spool size must be more than 0 g.';

  if (values.amountMode === 'set') {
    const grams = parseOptional(values.setGrams);
    if (grams === undefined || !Number.isFinite(grams) || grams <= 0)
      errors.amount = 'Enter the grams on this spool, more than 0.';
    else if (size !== undefined && !errors.spoolSize && grams > size)
      errors.amount = 'That’s more than the full spool size.';
  }

  const price = parseOptional(values.price);
  if (price !== undefined && !(Number.isFinite(price) && price >= 0))
    errors.price = 'Price can’t be negative.';

  return errors;
}

/** Converts valid form values to spool fields. */
export function filamentFormToFields(values: FilamentFormValues): FilamentFields {
  const preset = COLORS.find((color) => color.hex === values.colorHex);
  return {
    material: values.material === OTHER ? values.materialOther.trim() : values.material,
    finish: values.finish === OTHER ? values.finishOther.trim() : values.finish,
    colorHex: values.colorHex,
    colorName: values.colorName.trim() || preset?.name,
    startGrams:
      values.amountMode === 'new' ? newSpoolGrams(values.spoolSize) : Number(values.setGrams),
    brand: values.brand.trim() || undefined,
    price: parseOptional(values.price),
    spoolSizeGrams: parseOptional(values.spoolSize),
  };
}

/** Fills the form from an existing spool for editing. */
export function filamentFieldsToForm(fields: FilamentFields): FilamentFormValues {
  const knownMaterial = (MATERIALS as readonly string[]).includes(fields.material);
  const knownFinish = (FINISHES as readonly string[]).includes(fields.finish);
  const spoolSize = fields.spoolSizeGrams?.toString() ?? '';
  const preset = COLORS.find((color) => color.hex === fields.colorHex);
  return {
    material: knownMaterial ? fields.material : OTHER,
    materialOther: knownMaterial ? '' : fields.material,
    finish: knownFinish ? fields.finish : OTHER,
    finishOther: knownFinish ? '' : fields.finish,
    colorHex: fields.colorHex,
    colorName: fields.colorName && fields.colorName !== preset?.name ? fields.colorName : '',
    amountMode: fields.startGrams === newSpoolGrams(spoolSize) ? 'new' : 'set',
    setGrams: String(fields.startGrams),
    brand: fields.brand ?? '',
    price: fields.price?.toString() ?? '',
    spoolSize,
  };
}
