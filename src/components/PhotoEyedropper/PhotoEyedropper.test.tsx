import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllTables, listSpoolsWithRemaining } from '../../db/repository';
import type { Pixels } from '../../domain/eyedropper';
import { renderApp } from '../../test/renderApp';
import { loadPhotoPixels } from './loadPhotoPixels';

vi.mock('./loadPhotoPixels', () => ({ loadPhotoPixels: vi.fn() }));

/** A 100×50 photo of two spools side by side: red on the left half, blue on the right. */
function redAndBlue(): Pixels {
  const width = 100;
  const height = 50;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set(x < 50 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

beforeEach(async () => {
  await clearAllTables();
  vi.mocked(loadPhotoPixels).mockReset();
  vi.mocked(loadPhotoPixels).mockResolvedValue(redAndBlue());
});

async function openPhoto(user: UserEvent) {
  await user.upload(
    screen.getByLabelText('Pick color from a photo'),
    new File(['jpeg'], 'roll.jpg', { type: 'image/jpeg' }),
  );
  const sheet = await screen.findByRole('dialog', { name: 'Pick a color from the photo' });
  const photo = within(sheet).getByRole('img', { name: /^Photo\./ });
  // Displayed at 200×100 on screen, twice the photo's size.
  vi.spyOn(photo, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { sheet, photo };
}

describe('picking a color from a photo', () => {
  it('no longer offers preset basic colors', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    expect(screen.queryByRole('radiogroup', { name: 'Basic colors' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Red' })).toBeNull();
    expect(screen.getByLabelText('Custom color')).toBeInTheDocument();
  });

  it('opens the camera, and also offers the photo library', () => {
    renderApp('/filament/new');
    return waitFor(() => {
      const camera = screen.getByLabelText('Pick color from a photo');
      expect(camera).toHaveAttribute('accept', 'image/*');
      expect(camera).toHaveAttribute('capture', 'environment');
      expect(screen.getByLabelText('Pick color from a library photo')).not.toHaveAttribute('capture');
    });
  });

  it('uses the color where the photo is tapped', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(screen.getByRole('radio', { name: 'Matte' }));
    const { sheet, photo } = await openPhoto(user);

    // Starts in the middle of the photo.
    expect(photo).toHaveAccessibleName(/on #0000ff/);
    // Tap the red half, at (40, 50) on screen = pixel (20, 25).
    fireEvent.pointerDown(photo, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(photo, { pointerId: 1 });
    expect(within(sheet).getByText('#ff0000')).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Use this color' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Custom color')).toHaveValue('#ff0000');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('PLA · Matte');
    const [spool] = await listSpoolsWithRemaining();
    expect(spool?.colorHex).toBe('#ff0000');
  });

  it('follows a drag across the photo', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    const { sheet, photo } = await openPhoto(user);
    fireEvent.pointerDown(photo, { clientX: 20, clientY: 50, pointerId: 3 });
    expect(within(sheet).getByText('#ff0000')).toBeInTheDocument();
    fireEvent.pointerMove(photo, { clientX: 180, clientY: 50, pointerId: 3 });
    expect(within(sheet).getByText('#0000ff')).toBeInTheDocument();
    fireEvent.pointerUp(photo, { pointerId: 3 });
    // Moving without a finger down does nothing.
    fireEvent.pointerMove(photo, { clientX: 20, clientY: 50, pointerId: 3 });
    expect(within(sheet).getByText('#0000ff')).toBeInTheDocument();
  });

  it('can add a picked color to a gradient', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.click(screen.getByRole('radio', { name: 'Silk' }));

    // No base color yet, so only "Use this color".
    let { sheet, photo } = await openPhoto(user);
    expect(within(sheet).queryByRole('button', { name: 'Add as gradient color' })).toBeNull();
    fireEvent.pointerDown(photo, { clientX: 40, clientY: 50, pointerId: 1 });
    await user.click(within(sheet).getByRole('button', { name: 'Use this color' }));

    ({ sheet } = await openPhoto(user));
    await user.click(within(sheet).getByRole('button', { name: 'Add as gradient color' }));
    expect(screen.getByLabelText('Custom color')).toHaveValue('#ff0000');
    expect(screen.getByLabelText('Gradient color 2')).toHaveValue('#0000ff');
  });

  it('moves the sampling point with the arrow keys', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    const { photo } = await openPhoto(user);
    photo.focus();
    await user.keyboard('{ArrowLeft}');
    expect(photo).toHaveAccessibleName(/on #ff0000/);
  });

  it('closes without changing anything', async () => {
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    const { sheet } = await openPhoto(user);
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Gradient color 2')).toBeNull();
    expect(screen.getByLabelText('Custom color')).toHaveValue('#888888');
  });

  it('explains when a photo can’t be read', async () => {
    vi.mocked(loadPhotoPixels).mockRejectedValue(new Error('bad'));
    const { user } = renderApp('/filament/new');
    await user.click(await screen.findByRole('radio', { name: 'PLA' }));
    await user.upload(
      screen.getByLabelText('Pick color from a photo'),
      new File(['x'], 'roll.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByText('Couldn’t read that photo')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
