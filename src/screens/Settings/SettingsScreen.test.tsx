import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eraseAllData, exportBackupText } from '../../db/backup';
import { listSpoolsWithRemaining } from '../../db/repository';
import { getLowStockThreshold, setLowStockThreshold } from '../../db/settings';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => {
  await eraseAllData();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const jsonFile = (text: string) => new File([text], 'backup.json', { type: 'application/json' });

describe('Settings', () => {
  it('is reachable from the Filament tab', async () => {
    const { user } = renderApp('/filament');
    await user.click(await screen.findByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('saves the low-stock threshold', async () => {
    const { user } = renderApp('/settings');
    const input = await screen.findByRole('spinbutton');
    expect(input).toHaveValue(100);
    await user.clear(input);
    await user.type(input, '250');
    expect(getLowStockThreshold()).toBe(250);
  });

  it('keeps the old threshold while the input is invalid', async () => {
    setLowStockThreshold(80);
    const { user } = renderApp('/settings');
    await user.clear(await screen.findByRole('spinbutton'));
    expect(await screen.findByRole('alert')).toHaveTextContent('0 g or more');
    expect(getLowStockThreshold()).toBe(80);
  });

  it('exports a JSON backup download', async () => {
    await makeSpool();
    let downloaded: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      downloaded = blob as Blob;
      return 'blob:test';
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { user } = renderApp('/settings');
    await user.click(await screen.findByRole('button', { name: 'Export backup' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const parsed = JSON.parse(await downloaded!.text()) as { spools: unknown[] };
    expect(parsed.spools).toHaveLength(1);
  });

  it('imports a backup after asking', async () => {
    await makeSpool({ material: 'Saved' });
    const text = await exportBackupText();
    await eraseAllData();

    const { user } = renderApp('/settings');
    await user.upload(await screen.findByLabelText('Import backup'), jsonFile(text));
    const sheet = await screen.findByRole('dialog', { name: 'Replace all data?' });
    expect(await listSpoolsWithRemaining()).toHaveLength(0);
    await user.click(within(sheet).getByRole('button', { name: 'Replace with backup' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backup imported'));
    const spools = await listSpoolsWithRemaining();
    expect(spools[0]?.material).toBe('Saved');
  });

  it('explains a bad backup and changes nothing', async () => {
    await makeSpool();
    const { user } = renderApp('/settings');
    await user.upload(await screen.findByLabelText('Import backup'), jsonFile('{"a":1}'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('isn’t a Filament'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await listSpoolsWithRemaining()).toHaveLength(1);
  });

  it('requires typing ERASE exactly', async () => {
    await makeSpool();
    const { user } = renderApp('/settings');
    await user.click(await screen.findByRole('button', { name: 'Erase all data' }));
    const sheet = await screen.findByRole('dialog', { name: 'Erase all data?' });
    const confirm = within(sheet).getByRole('button', { name: 'Erase everything' });
    const input = within(sheet).getByRole('textbox');

    expect(confirm).toBeDisabled();
    await user.type(input, 'erase');
    expect(confirm).toBeDisabled();
    expect(await listSpoolsWithRemaining()).toHaveLength(1);

    await user.clear(input);
    await user.type(input, 'ERASE');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('All data erased'));
    expect(await listSpoolsWithRemaining()).toHaveLength(0);
  });
});
