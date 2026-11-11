import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPrint,
  clearAllTables,
  getPrintSummary,
  getSpoolRemaining,
  listPrintSummaries,
} from '../../db/repository';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

vi.mock('../../components/PhotoPicker/compressPhoto', () => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/jpeg' })),
}));

beforeEach(async () => {
  await clearAllTables();
});

async function setupPrint(photoPending = false) {
  const a = await makeSpool({ material: 'PLA', finish: 'Matte' });
  const b = await makeSpool({ material: 'ABS', finish: 'Silk', startGrams: 500 });
  const print = await addPrint({
    name: 'Benchy',
    photoPending,
    filaments: [
      { spoolId: a.id, slot: 1, grams: 100 },
      { spoolId: b.id, slot: 2, grams: 50 },
    ],
  });
  return { a, b, print };
}

describe('Prints tab', () => {
  it('lists prints newest first with grams and filament dots', async () => {
    const { a } = await setupPrint();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await addPrint({ name: 'Newer', filaments: [{ spoolId: a.id, slot: 1, grams: 1 }] });
    renderApp('/prints');
    await screen.findByText('Benchy');
    const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.match(/\/prints\/[0-9a-f-]{36}/));
    expect(links[0]).toHaveTextContent('Newer');
    expect(links[1]).toHaveTextContent('150 g');
    expect(within(links[1]!).getByRole('img', { name: 'Red PLA' })).toBeInTheDocument();
    expect(within(links[1]!).getAllByRole('img')).toHaveLength(2);
  });

  it('has a friendly empty state', async () => {
    renderApp('/prints');
    expect(await screen.findByText('No prints yet, log your first one')).toBeInTheDocument();
  });

  it('opens Print Detail when a row is tapped', async () => {
    await setupPrint();
    const { user } = renderApp('/prints');
    await user.click(await screen.findByText('Benchy'));
    expect(await screen.findByRole('heading', { name: 'Benchy' })).toBeInTheDocument();
  });
});

describe('Print Detail', () => {
  it('shows the filaments and grams used', async () => {
    const { print } = await setupPrint();
    renderApp(`/prints/${print.id}`);
    expect(await screen.findByText('PLA · Matte')).toBeInTheDocument();
    expect(screen.getByText('100 g')).toBeInTheDocument();
    expect(screen.getByText('50 g')).toBeInTheDocument();
  });

  it('recalculates the spools when grams are edited', async () => {
    const { a, b, print } = await setupPrint();
    const { user } = renderApp(`/prints/${print.id}`);
    await user.click(await screen.findByRole('button', { name: 'Edit grams' }));
    const input = screen.getByRole('spinbutton', { name: 'Grams of PLA · Matte, slot 1' });
    await user.clear(input);
    await user.type(input, '40');
    expect(screen.getByText('960 g left after this change')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save grams' }));

    expect(await screen.findByRole('button', { name: 'Edit grams' })).toBeInTheDocument();
    expect(await getSpoolRemaining(a.id)).toBe(960);
    expect(await getSpoolRemaining(b.id)).toBe(450);
  });

  it('leaves the spools alone when an edit is cancelled', async () => {
    const { a, print } = await setupPrint();
    const { user } = renderApp(`/prints/${print.id}`);
    await user.click(await screen.findByRole('button', { name: 'Edit grams' }));
    const input = screen.getByRole('spinbutton', { name: 'Grams of PLA · Matte, slot 1' });
    await user.clear(input);
    await user.type(input, '40');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await getSpoolRemaining(a.id)).toBe(900);
  });

  it('asks first, then deleting gives the grams back', async () => {
    const { a, b, print } = await setupPrint();
    const { user } = renderApp(`/prints/${print.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const sheet = await screen.findByRole('dialog', { name: 'Delete this print?' });
    expect(await getPrintSummary(print.id)).not.toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Delete print' }));

    expect(await screen.findByRole('heading', { name: 'Prints' })).toBeInTheDocument();
    expect(await getSpoolRemaining(a.id)).toBe(1000);
    expect(await getSpoolRemaining(b.id)).toBe(500);
    expect(await listPrintSummaries()).toHaveLength(0);
  });

  it('offers Undo after a delete', async () => {
    const { a, print } = await setupPrint();
    const { user } = renderApp(`/prints/${print.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete print' }));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Benchy')).toBeInTheDocument();
    expect(await getSpoolRemaining(a.id)).toBe(900);
  });

  it('adds a photo and clears the Photo needed badge', async () => {
    const { print } = await setupPrint(true);
    const { user } = renderApp(`/prints/${print.id}`);
    expect(await screen.findByText('Photo needed')).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Take photo'),
      new File(['big'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await waitFor(() => expect(screen.queryByText('Photo needed')).toBeNull());
    const summary = await getPrintSummary(print.id);
    expect(await summary?.print.photo?.text()).toBe('small');
  });
});
