import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllTables, listSavedColors, listSpoolsWithRemaining } from '../../db/repository';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await clearAllTables();
});

const pick = (name: string) => screen.getByRole('radio', { name });

describe('colors per material and finish', () => {
  it('shows only the colors saved for the chosen material and finish', async () => {
    await makeSpool({ material: 'PLA', finish: 'Basic', colorHex: '#111111', colorName: 'Jade White' });
    await makeSpool({ material: 'PLA', finish: 'Matte', colorHex: '#222222', colorName: 'Charcoal' });
    await makeSpool({ material: 'PETG', finish: 'Basic', colorHex: '#333333', colorName: 'Clear' });

    const { user } = renderApp('/filament/new');
    expect(await screen.findByText(/Choose a material and finish/)).toBeInTheDocument();

    await user.click(pick('PLA'));
    await user.click(pick('Basic'));
    const plaBasic = await screen.findByRole('radiogroup', { name: 'Your PLA · Basic colors' });
    expect(within(plaBasic).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Jade White',
    ]);

    await user.click(pick('Matte'));
    const plaMatte = await screen.findByRole('radiogroup', { name: 'Your PLA · Matte colors' });
    expect(within(plaMatte).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Charcoal',
    ]);

    await user.click(pick('PETG'));
    await user.click(pick('Basic'));
    const petgBasic = await screen.findByRole('radiogroup', { name: 'Your PETG · Basic colors' });
    expect(within(petgBasic).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Clear',
    ]);
  });

  it('saves every new color to that material and finish automatically', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'ABS' }));
    await user.click(pick('Silk'));
    expect(await screen.findByText(/Colors you save for ABS · Silk are kept here/)).toBeInTheDocument();
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#123456' } });
    await user.type(screen.getByLabelText('Color name (optional)'), 'Deep Sea');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('ABS · Silk');

    expect((await listSavedColors('ABS', 'Silk')).map((c) => [c.name, c.colorHex])).toEqual([
      ['Deep Sea', '#123456'],
    ]);
    expect(await listSavedColors('ABS', 'Basic')).toHaveLength(0);
  });

  it('reuses a saved color in one tap, gradient and shine included', async () => {
    await makeSpool({
      material: 'PLA',
      finish: 'Silk',
      colorHex: '#ff0000',
      colorStops: ['#ff0000', '#ffd700'],
      shiny: true,
      colorName: 'Sunset',
    });
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(pick('Silk'));
    await user.click(await screen.findByRole('radio', { name: 'Sunset, gradient, shiny' }));
    expect(screen.getByLabelText('Gradient color 2')).toHaveValue('#ffd700');
    expect(screen.getByRole('checkbox', { name: /Shiny/ })).toBeChecked();
    expect(screen.getByLabelText('Color name (optional)')).toHaveValue('Sunset');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Filament added');

    const spools = await listSpoolsWithRemaining();
    expect(spools).toHaveLength(2);
    expect(spools[1]).toMatchObject({ colorStops: ['#ff0000', '#ffd700'], shiny: true });
    expect(await listSavedColors('PLA', 'Silk')).toHaveLength(1);
  });

  it('removes a saved color, with Undo', async () => {
    await makeSpool({ material: 'PLA', finish: 'Matte', colorName: 'Red' });
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(pick('Matte'));
    await screen.findByRole('radiogroup', { name: 'Your PLA · Matte colors' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Remove Red' }));
    await waitFor(async () => expect(await listSavedColors('PLA', 'Matte')).toHaveLength(0));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await listSavedColors('PLA', 'Matte')).toHaveLength(1));
  });
});

describe('gradients and shine', () => {
  it('builds a shiny gradient of up to four colors and saves it', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(pick('Silk'));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#d32f2f' } });

    const add = screen.getByRole('button', { name: 'Add gradient color' });
    await user.click(add);
    fireEvent.input(screen.getByLabelText('Gradient color 2'), { target: { value: '#ffd700' } });
    await user.click(add);
    fireEvent.input(screen.getByLabelText('Gradient color 3'), { target: { value: '#0000ff' } });
    await user.click(add);
    expect(screen.queryByRole('button', { name: 'Gradient color' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove gradient color 4' }));

    await user.click(screen.getByRole('checkbox', { name: /Shiny/ }));
    await user.type(screen.getByLabelText('Color name (optional)'), 'Rainbow');
    expect(screen.getByRole('img', { name: 'Preview: Rainbow, gradient, shiny' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Rainbow');

    const [spool] = await listSpoolsWithRemaining();
    expect(spool).toMatchObject({
      colorHex: '#d32f2f',
      colorStops: ['#d32f2f', '#ffd700', '#0000ff'],
      shiny: true,
      colorName: 'Rainbow',
    });
  });

  it('can make a single basic color shiny', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(pick('Silk'));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#c7c9cc' } });
    await user.type(screen.getByLabelText('Color name (optional)'), 'Silver');
    await user.click(screen.getByRole('checkbox', { name: /Shiny/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('PLA · Silk');
    const [spool] = await listSpoolsWithRemaining();
    expect(spool).toMatchObject({ colorHex: '#c7c9cc', shiny: true, colorName: 'Silver' });
    expect(spool?.colorStops).toBeUndefined();
  });
});
