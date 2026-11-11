import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllTables, listSpoolsWithRemaining } from '../../db/repository';
import { clearDraft } from '../../db/draftStorage';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await clearAllTables();
  clearDraft();
});

async function addSpoolThroughForm(user: UserEvent, material: string, finish: string, color: string) {
  await user.click(await screen.findByRole('link', { name: /^add filament$/i }));
  await screen.findByRole('heading', { name: 'Add Filament' });
  await user.click(screen.getByRole('radio', { name: material }));
  await user.click(screen.getByRole('radio', { name: finish }));
  await user.click(within(screen.getByRole('radiogroup', { name: 'Basic colors' })).getByRole('radio', { name: color }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText(`${material} · ${finish}`);
}

async function tileGrams(description: string) {
  const tile = (await screen.findByText(description)).closest('a');
  return tile?.textContent ?? '';
}

describe('a print from start to finish', () => {
  it('adds 2 spools, logs a 2-filament print, edits it, deletes it, and gives the grams back', async () => {
    const { user } = renderApp('/filament');
    await addSpoolThroughForm(user, 'PLA', 'Matte', 'Red');
    await addSpoolThroughForm(user, 'PETG', 'Basic', 'Blue');
    expect(await tileGrams('PLA · Matte')).toContain('1,000 g');
    expect(await tileGrams('PETG · Basic')).toContain('1,000 g');

    // Log the print.
    await user.click(screen.getByRole('link', { name: 'Prints' }));
    await user.click(await screen.findByRole('link', { name: 'Add Print' }));
    await user.type(await screen.findByRole('textbox', { name: /^Name$/ }), 'Benchy');
    for (const [slot, text] of [
      [1, 'PLA · Matte'],
      [2, 'PETG · Basic'],
    ] as const) {
      await user.click(screen.getByRole('button', { name: `Slot ${slot}: add filament` }));
      const sheet = await screen.findByRole('dialog', { name: 'Choose filament' });
      await user.click(await within(sheet).findByText(text));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    await user.click(screen.getByRole('button', { name: 'Next' }));
    for (const grams of ['120', '45']) {
      const input = await screen.findByRole('spinbutton', { name: 'Grams used' });
      await user.clear(input);
      await user.type(input, grams);
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Skip' }));
    await screen.findByText('Benchy');

    // Both spools dropped, on screen and in the data.
    await user.click(screen.getByRole('link', { name: 'Filament' }));
    expect(await tileGrams('PLA · Matte')).toContain('880 g');
    expect(await tileGrams('PETG · Basic')).toContain('955 g');

    // Edit the print's grams.
    await user.click(screen.getByRole('link', { name: 'Prints' }));
    await user.click(await screen.findByText('Benchy'));
    await user.click(await screen.findByRole('button', { name: 'Edit grams' }));
    const pla = screen.getByRole('spinbutton', { name: 'Grams of PLA · Matte, slot 1' });
    await user.clear(pla);
    await user.type(pla, '200');
    const petg = screen.getByRole('spinbutton', { name: 'Grams of PETG · Basic, slot 2' });
    await user.clear(petg);
    await user.type(petg, '5');
    await user.click(screen.getByRole('button', { name: 'Save grams' }));
    await screen.findByRole('button', { name: 'Edit grams' });
    const remaining = async () =>
      Object.fromEntries((await listSpoolsWithRemaining()).map((s) => [s.material, s.remaining]));
    expect(await remaining()).toEqual({ PLA: 800, PETG: 995 });

    // Delete it, and the grams come back.
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const sheet = await screen.findByRole('dialog', { name: 'Delete this print?' });
    await user.click(within(sheet).getByRole('button', { name: 'Delete print' }));
    await screen.findByText('No prints yet, log your first one');
    expect(await remaining()).toEqual({ PLA: 1000, PETG: 1000 });
    await user.click(screen.getByRole('link', { name: 'Filament' }));
    expect(await tileGrams('PLA · Matte')).toContain('1,000 g');
    expect(await tileGrams('PETG · Basic')).toContain('1,000 g');
  });
});
