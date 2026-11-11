import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAllTables, listSpoolsWithRemaining } from '../../db/repository';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await clearAllTables();
});

describe('Add Filament', () => {
  it('adds a spool that appears in the grid, with a confirmation', async () => {
    const { user } = renderApp('/filament');
    await user.click(await screen.findByRole('link', { name: 'Add Filament' }));

    await user.click(await screen.findByRole('radio', { name: 'PETG' }));
    await user.click(screen.getByRole('radio', { name: 'Silk' }));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#00897b' } });
    await user.type(screen.getByLabelText('Color name (optional)'), 'Teal');
    expect(screen.getByRole('radio', { name: 'New (1,000 g)' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const tile = (await screen.findByText('PETG · Silk')).closest('a')!;
    expect(within(tile).getByText('1,000 g')).toBeInTheDocument();
    expect(within(tile).getByText('Teal')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Filament added');
  });

  it('shows errors and saves nothing when incomplete', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Choose a material.')).toBeInTheDocument();
    expect(screen.getByText('Choose a finish.')).toBeInTheDocument();
    expect(screen.getByText('Choose a color.')).toBeInTheDocument();
    expect(await listSpoolsWithRemaining()).toHaveLength(0);
  });

  it('shows a text box for Other and uses its value', async () => {
    const { user } = renderApp('/filament/new');
    const material = within(await screen.findByRole('group', { name: 'Material' }));
    await user.click(material.getByRole('radio', { name: 'Other' }));
    await user.type(await screen.findByLabelText('Material name'), 'PC');
    await user.click(screen.getByRole('radio', { name: 'Basic' }));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#d32f2f' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('PC · Basic')).toBeInTheDocument();
  });

  it('accepts a partly used spool through Set…', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(screen.getByRole('radio', { name: 'Matte' }));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#1c1c1e' } });
    await user.click(screen.getByRole('radio', { name: 'Set…' }));
    await user.type(await screen.findByLabelText('Grams on spool'), '412');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('412 g')).toBeInTheDocument();
  });

  it('keeps More details collapsed until opened, and saves them', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(screen.getByRole('radio', { name: 'Matte' }));
    fireEvent.input(screen.getByLabelText('Custom color'), { target: { value: '#1e5fd0' } });
    expect(screen.queryByLabelText('Brand')).toBeNull();
    await user.click(screen.getByRole('button', { name: /More details/ }));
    await user.type(screen.getByLabelText('Brand'), 'Acme');
    await user.type(screen.getByLabelText('Price paid'), '19.5');
    await user.type(screen.getByLabelText('Full spool size (g)'), '750');
    expect(screen.getByRole('radio', { name: 'New (750 g)' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('750 g')).toBeInTheDocument();
    const [spool] = await listSpoolsWithRemaining();
    expect(spool).toMatchObject({
      brand: 'Acme',
      price: 19.5,
      spoolSizeGrams: 750,
      startGrams: 750,
    });
  });

  it('accepts a custom color with a name', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(screen.getByRole('radio', { name: 'Matte' }));
    const picker = screen.getByLabelText('Custom color');
    fireEvent.input(picker, { target: { value: '#123456' } });
    await user.type(screen.getByLabelText('Color name (optional)'), 'Jade White');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Jade White')).toBeInTheDocument();
    const [spool] = await listSpoolsWithRemaining();
    expect(spool?.colorHex).toBe('#123456');
  });
});
