import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILAMENT_FORM,
  filamentFieldsToForm,
  filamentFormToFields,
  validateFilamentForm,
  type FilamentFormValues,
} from './filamentForm';

const valid: FilamentFormValues = {
  ...EMPTY_FILAMENT_FORM,
  material: 'PLA',
  finish: 'Matte',
  colorHex: '#d32f2f',
};

describe('validateFilamentForm', () => {
  it('accepts a complete form', () => {
    expect(validateFilamentForm(valid)).toEqual({});
  });

  it('requires material, finish, and color', () => {
    expect(validateFilamentForm(EMPTY_FILAMENT_FORM)).toMatchObject({
      material: expect.any(String),
      finish: expect.any(String),
      color: expect.any(String),
    });
  });

  it('requires text for Other', () => {
    expect(validateFilamentForm({ ...valid, material: 'Other' }).material).toBeDefined();
    expect(validateFilamentForm({ ...valid, finish: 'Other' }).finish).toBeDefined();
    expect(
      validateFilamentForm({ ...valid, material: 'Other', materialOther: 'PC' }).material,
    ).toBeUndefined();
  });

  it('requires positive grams for Set', () => {
    expect(validateFilamentForm({ ...valid, amountMode: 'set' }).amount).toBeDefined();
    expect(
      validateFilamentForm({ ...valid, amountMode: 'set', setGrams: '0' }).amount,
    ).toBeDefined();
    expect(
      validateFilamentForm({ ...valid, amountMode: 'set', setGrams: '350' }).amount,
    ).toBeUndefined();
  });

  it('rejects Set grams larger than the spool size', () => {
    expect(
      validateFilamentForm({ ...valid, amountMode: 'set', setGrams: '800', spoolSize: '750' })
        .amount,
    ).toBeDefined();
  });

  it('rejects a negative price and a non-positive spool size', () => {
    expect(validateFilamentForm({ ...valid, price: '-1' }).price).toBeDefined();
    expect(validateFilamentForm({ ...valid, spoolSize: '0' }).spoolSize).toBeDefined();
  });
});

describe('filamentFormToFields', () => {
  it('starts a New spool at 1,000 g', () => {
    expect(filamentFormToFields(valid).startGrams).toBe(1000);
  });

  it('starts a New spool at its full size when one is given', () => {
    expect(filamentFormToFields({ ...valid, spoolSize: '750' })).toMatchObject({
      startGrams: 750,
      spoolSizeGrams: 750,
    });
  });

  it('uses the typed grams for Set', () => {
    expect(
      filamentFormToFields({ ...valid, amountMode: 'set', setGrams: '350' }).startGrams,
    ).toBe(350);
  });

  it('uses custom text for Other', () => {
    expect(
      filamentFormToFields({ ...valid, material: 'Other', materialOther: ' PC ' }).material,
    ).toBe('PC');
  });

  it('names preset colors unless a name was typed', () => {
    expect(filamentFormToFields(valid).colorName).toBe('Red');
    expect(filamentFormToFields({ ...valid, colorName: 'Jade' }).colorName).toBe('Jade');
    expect(filamentFormToFields({ ...valid, colorHex: '#123456' }).colorName).toBeUndefined();
  });
});

describe('filamentFieldsToForm', () => {
  it('round-trips through the form', () => {
    const fields = {
      material: 'PC',
      finish: 'Matte',
      colorHex: '#123456',
      colorName: 'Deep',
      startGrams: 350,
      brand: 'Acme',
      price: 19.5,
      spoolSizeGrams: 750,
    };
    expect(filamentFormToFields(filamentFieldsToForm(fields))).toEqual(fields);
  });

  it('recognises a full spool as New', () => {
    expect(
      filamentFieldsToForm({
        material: 'PLA',
        finish: 'Basic',
        colorHex: '#000000',
        startGrams: 1000,
      }).amountMode,
    ).toBe('new');
  });
});
