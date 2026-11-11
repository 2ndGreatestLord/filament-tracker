import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllTables,
  getSpoolRemaining,
  listPrintSummaries,
  listSpoolsWithRemaining,
  setSpoolArchived,
} from '../../db/repository';
import { clearDraft, loadDraft, saveDraft } from '../../db/draftStorage';
import { makeSpool } from '../../test/factories';
import { renderApp } from '../../test/renderApp';

vi.mock('../../components/PhotoPicker/compressPhoto', () => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/jpeg' })),
}));

beforeEach(async () => {
  await clearAllTables();
  clearDraft();
});

async function pickSlot(user: UserEvent, slot: number, tileText: string) {
  await user.click(await screen.findByRole('button', { name: `Slot ${slot}: add filament` }));
  const sheet = await screen.findByRole('dialog', { name: 'Choose filament' });
  await user.click(await within(sheet).findByText(tileText));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

async function setGrams(user: UserEvent, grams: string) {
  const input = await screen.findByRole('spinbutton', { name: 'Grams used' });
  await user.clear(input);
  await user.type(input, grams);
}

describe('Add Print', () => {
  it('adds a 2-filament print and both spools drop by the right amounts', async () => {
    const a = await makeSpool({ material: 'PLA', finish: 'Matte' });
    const b = await makeSpool({ material: 'PETG', finish: 'Basic', startGrams: 500 });

    const { user } = renderApp('/prints');
    await user.click(await screen.findByRole('link', { name: 'Add Print' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Benchy');
    await pickSlot(user, 1, 'PLA · Matte');
    await pickSlot(user, 2, 'PETG · Basic');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('heading', { name: 'Filament 1 of 2' })).toBeInTheDocument();
    await setGrams(user, '35');
    expect(screen.getByText('1,000 g left → 965 g after this print.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('heading', { name: 'Filament 2 of 2' })).toBeInTheDocument();
    await setGrams(user, '12.5');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByRole('heading', { name: 'Photo' });
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(await screen.findByRole('heading', { name: 'Prints' })).toBeInTheDocument();
    expect(await screen.findByText('Benchy')).toBeInTheDocument();
    expect(await getSpoolRemaining(a.id)).toBe(965);
    expect(await getSpoolRemaining(b.id)).toBe(487.5);
  });

  it('enables Next only with a name and a slot', async () => {
    await makeSpool();
    const { user } = renderApp('/prints/new');
    const next = await screen.findByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Boat');
    expect(next).toBeDisabled();
    await pickSlot(user, 3, 'PLA · Matte');
    expect(next).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Clear slot 3' }));
    expect(next).toBeDisabled();
  });

  it('keeps everything typed when going Back', async () => {
    await makeSpool({ material: 'PLA', finish: 'Matte' });
    await makeSpool({ material: 'ABS', finish: 'Silk' });
    const { user } = renderApp('/prints/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    await pickSlot(user, 1, 'PLA · Matte');
    await pickSlot(user, 2, 'ABS · Silk');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await setGrams(user, '20');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Filament 2 of 2' });
    await setGrams(user, '30');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Photo' });

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('heading', { name: 'Filament 2 of 2' });
    expect(screen.getByRole('spinbutton', { name: 'Grams used' })).toHaveValue(30);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('heading', { name: 'Filament 1 of 2' });
    expect(screen.getByRole('spinbutton', { name: 'Grams used' })).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('heading', { name: 'Add Print' });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Boat');
    expect(screen.getByRole('button', { name: 'Slot 1: PLA · Matte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slot 2: ABS · Silk' })).toBeInTheDocument();
  });

  it('keeps the dial, input, and buttons in sync', async () => {
    await makeSpool();
    const { user } = renderApp('/prints/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    await pickSlot(user, 1, 'PLA · Matte');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const dial = await screen.findByRole('slider', { name: 'Grams dial' });
    const input = screen.getByRole('spinbutton', { name: 'Grams used' });

    await user.click(screen.getByRole('button', { name: /Add 10 grams/ }));
    expect(input).toHaveValue(10);
    expect(dial).toHaveAttribute('aria-valuenow', '10');

    await setGrams(user, '42');
    expect(dial).toHaveAttribute('aria-valuenow', '42');

    await user.click(screen.getByRole('button', { name: /Subtract 10 grams/ }));
    expect(input).toHaveValue(32);

    dial.focus();
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue(33);
  });

  it('warns about too many grams but allows it, stopping at 0', async () => {
    const spool = await makeSpool({ startGrams: 50 });
    const { user } = renderApp('/prints/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    await pickSlot(user, 1, 'PLA · Matte');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await setGrams(user, '80');
    expect(screen.getByRole('alert')).toHaveTextContent('more than this spool holds');
    expect(screen.getByText('50 g left → 0 g after this print.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Photo' });
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await screen.findByText('Boat');
    expect(await getSpoolRemaining(spool.id)).toBe(0);
  });

  it('adds a new spool from the picker without leaving the flow', async () => {
    const { user } = renderApp('/prints/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    await user.click(screen.getByRole('button', { name: 'Slot 1: add filament' }));
    const sheet = await screen.findByRole('dialog', { name: 'Choose filament' });
    await user.click(within(sheet).getByRole('button', { name: 'Add filament' }));

    const form = await screen.findByRole('dialog', { name: 'Add Filament' });
    await user.click(within(form).getByRole('radio', { name: 'ASA' }));
    await user.click(within(form).getByRole('radio', { name: 'Glow' }));
    fireEvent.input(within(form).getByLabelText('Custom color'), { target: { value: '#9ccc33' } });
    await user.click(within(form).getByRole('button', { name: 'Save and use' }));

    expect(await screen.findByRole('button', { name: 'Slot 1: ASA · Glow' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Boat');
    expect(await listSpoolsWithRemaining()).toHaveLength(1);
  });

  it('hides archived spools and blocks a spool already in another slot', async () => {
    await makeSpool({ material: 'PLA', finish: 'Matte' });
    const archived = await makeSpool({ material: 'ASA', finish: 'Matte' });
    await setSpoolArchived(archived.id, true);
    const { user } = renderApp('/prints/new');
    await pickSlot(user, 1, 'PLA · Matte');
    await user.click(await screen.findByRole('button', { name: 'Slot 2: add filament' }));
    const sheet = await screen.findByRole('dialog', { name: 'Choose filament' });
    expect(within(sheet).queryByText('ASA · Matte')).toBeNull();
    expect(within(sheet).getByText('PLA · Matte').closest('button')).toBeDisabled();
  });

  async function reachPhotoStep(user: UserEvent) {
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    await pickSlot(user, 1, 'PLA · Matte');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await setGrams(user, '5');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Photo' });
  }

  it('Save later marks the print as needing a photo', async () => {
    await makeSpool();
    const { user } = renderApp('/prints/new');
    await reachPhotoStep(user);
    await user.click(screen.getByRole('button', { name: 'Save later' }));
    expect(await screen.findByText('Photo needed')).toBeInTheDocument();
    const [summary] = await listPrintSummaries();
    expect(summary?.print.photoPending).toBe(true);
  });

  it('Skip saves without a photo or badge', async () => {
    await makeSpool();
    const { user } = renderApp('/prints/new');
    await reachPhotoStep(user);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await screen.findByText('Boat');
    expect(screen.queryByText('Photo needed')).toBeNull();
    const [summary] = await listPrintSummaries();
    expect(summary?.print.photoPending).toBe(false);
    expect(summary?.print.photo).toBeUndefined();
  });

  it('saves the shrunk photo with the print', async () => {
    await makeSpool();
    const { user } = renderApp('/prints/new');
    await reachPhotoStep(user);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    const camera = screen.getByLabelText('Take photo');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(camera).toHaveAttribute('capture', 'environment');
    await user.upload(camera, new File(['big'], 'photo.jpg', { type: 'image/jpeg' }));

    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    await screen.findByText('Boat');
    const [summary] = await listPrintSummaries();
    expect(await summary?.print.photo?.text()).toBe('small');
    expect(summary?.print.photoPending).toBe(false);
  });

  it('restores the draft after the page is reloaded', async () => {
    const spool = await makeSpool();
    saveDraft({ name: 'Boat', spools: { 1: spool.id }, grams: { 1: 44 } });
    renderApp('/prints/new/grams/0');
    expect(await screen.findByRole('spinbutton', { name: 'Grams used' })).toHaveValue(44);
  });

  it('forgets the draft after leaving the flow', async () => {
    await makeSpool();
    const { user, unmount } = renderApp('/prints/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Boat');
    expect(loadDraft()?.name).toBe('Boat');
    unmount();
    expect(loadDraft()).toBeNull();
  });

  it('never puts the photo in text storage', () => {
    saveDraft({ name: 'A', spools: {}, grams: {}, photo: new Blob(['x']) });
    expect(loadDraft()).toEqual({ name: 'A', spools: {}, grams: {} });
  });

  it('restarts the flow if the draft is gone after a reload', async () => {
    renderApp('/prints/new/grams/1');
    expect(await screen.findByRole('heading', { name: 'Add Print' })).toBeInTheDocument();
  });
});
