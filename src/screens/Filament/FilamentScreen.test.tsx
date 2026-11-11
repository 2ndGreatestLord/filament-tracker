import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { addPrint, clearAllTables, setSpoolArchived } from '../../db/repository';
import { resetSettings, setLowStockThreshold } from '../../db/settings';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await clearAllTables();
  resetSettings();
});

describe('Filament tab', () => {
  it('shows a friendly empty state with an add button', async () => {
    renderApp('/filament');
    expect(await screen.findByText('No filament yet, add your first spool')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Filament' })).toHaveAttribute(
      'href',
      '/filament/new',
    );
  });

  it('renders tiles with computed grams and status', async () => {
    const full = await makeSpool({ material: 'PETG', finish: 'Basic' });
    const low = await makeSpool({ material: 'ABS', finish: 'Silk' });
    const gone = await makeSpool({ material: 'TPU', finish: 'Wood', startGrams: 50 });
    await addPrint({
      name: 'Boat',
      filaments: [
        { spoolId: full.id, slot: 1, grams: 200 },
        { spoolId: low.id, slot: 2, grams: 950 },
        { spoolId: gone.id, slot: 3, grams: 80 },
      ],
    });

    renderApp('/filament');

    const fullTile = (await screen.findByText('PETG · Basic')).closest('a')!;
    expect(within(fullTile).getByText('800 g')).toBeInTheDocument();
    expect(fullTile).toHaveAttribute('data-status', 'ok');

    const lowTile = screen.getByText('ABS · Silk').closest('a')!;
    expect(within(lowTile).getByText('50 g')).toBeInTheDocument();
    expect(within(lowTile).getByText('Low')).toBeInTheDocument();

    const goneTile = screen.getByText('TPU · Wood').closest('a')!;
    expect(within(goneTile).getByText('0 g')).toBeInTheDocument();
    expect(within(goneTile).getByText('Empty')).toBeInTheDocument();
  });

  it('uses the saved threshold', async () => {
    setLowStockThreshold(2000);
    await makeSpool();
    renderApp('/filament');
    expect(await screen.findByText('Low')).toBeInTheDocument();
  });

  it('puts the + tile last', async () => {
    await makeSpool();
    renderApp('/filament');
    await screen.findByText('PLA · Matte');
    const items = screen.getAllByRole('listitem');
    expect(within(items.at(-1)!).getByText('Add filament')).toBeInTheDocument();
  });

  it('hides archived spools until asked', async () => {
    await makeSpool({ material: 'PLA' });
    const archived = await makeSpool({ material: 'ASA' });
    await setSpoolArchived(archived.id, true);
    const { user } = renderApp('/filament');
    await screen.findByText('PLA · Matte');
    expect(screen.queryByText('ASA · Matte')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show archived (1)' }));
    expect(await screen.findByText('ASA · Matte')).toBeInTheDocument();
  });
});
