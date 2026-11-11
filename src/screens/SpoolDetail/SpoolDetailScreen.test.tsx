import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPrint,
  clearAllTables,
  getSpool,
  getSpoolRemaining,
} from '../../db/repository';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await clearAllTables();
});

describe('Spool Detail', () => {
  it('shows remaining, used, attributes, and history', async () => {
    const spool = await makeSpool({ brand: 'Acme', price: 20 });
    await addPrint({ name: 'Benchy', filaments: [{ spoolId: spool.id, slot: 1, grams: 300 }] });
    renderApp(`/filament/${spool.id}`);
    expect(await screen.findByText('700 g')).toBeInTheDocument();
    expect(screen.getByText('remaining · 300 g used')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Benchy/ })).toHaveTextContent('300 g');
    expect(screen.getByRole('img', { name: 'Red spool, 70% remaining' })).toBeInTheDocument();
  });

  it('opens from a tile', async () => {
    await makeSpool();
    const { user } = renderApp('/filament');
    await user.click(await screen.findByText('PLA · Matte'));
    expect(await screen.findByRole('heading', { name: 'PLA · Matte' })).toBeInTheDocument();
  });

  it('adjusts remaining after weighing', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Benchy', filaments: [{ spoolId: spool.id, slot: 1, grams: 300 }] });
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('button', { name: 'Adjust remaining' }));
    const sheet = await screen.findByRole('dialog', { name: 'Adjust remaining' });
    const input = within(sheet).getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '650');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('650 g')).toBeInTheDocument();
    expect(await getSpoolRemaining(spool.id)).toBe(650);
  });

  it('rejects an invalid measurement', async () => {
    const spool = await makeSpool();
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('button', { name: 'Adjust remaining' }));
    const sheet = await screen.findByRole('dialog', { name: 'Adjust remaining' });
    await user.clear(within(sheet).getByRole('spinbutton'));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('0 g or more');
    expect(await getSpoolRemaining(spool.id)).toBe(1000);
  });

  it('archives and unarchives', async () => {
    const spool = await makeSpool();
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(await screen.findByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
    expect((await getSpool(spool.id))?.archived).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Unarchive' }));
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect((await getSpool(spool.id))?.archived).toBe(false);
  });

  it('blocks Delete while prints use the spool and offers Archive', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Benchy', filaments: [{ spoolId: spool.id, slot: 1, grams: 1 }] });
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const sheet = await screen.findByRole('dialog', { name: 'Can’t delete this spool' });
    expect(await getSpool(spool.id)).toBeDefined();
    await user.click(within(sheet).getByRole('button', { name: 'Archive' }));
    expect(await screen.findByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
    expect((await getSpool(spool.id))?.archived).toBe(true);
  });

  it('deletes an unused spool and offers Undo', async () => {
    const spool = await makeSpool();
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No filament yet, add your first spool')).toBeInTheDocument();
    expect(await getSpool(spool.id)).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('PLA · Matte')).toBeInTheDocument();
    expect(await getSpool(spool.id)).toBeDefined();
  });

  it('edits a spool, keeping its usage', async () => {
    const spool = await makeSpool();
    await addPrint({ name: 'Benchy', filaments: [{ spoolId: spool.id, slot: 1, grams: 100 }] });
    const { user } = renderApp(`/filament/${spool.id}`);
    await user.click(await screen.findByRole('link', { name: 'Edit' }));
    expect(await screen.findByRole('radio', { name: 'PLA' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Silk' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('heading', { name: 'PLA · Silk' })).toBeInTheDocument();
    expect(await getSpoolRemaining(spool.id)).toBe(900);
  });

  it('handles a spool that no longer exists', async () => {
    renderApp('/filament/missing');
    expect(await screen.findByText('This spool no longer exists.')).toBeInTheDocument();
  });
});
