import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './BottomSheet';

function setup() {
  const onClose = vi.fn();
  const view = render(
    <BottomSheet title="Pick" onClose={onClose}>
      <button type="button">Only action</button>
    </BottomSheet>,
  );
  return { onClose, user: userEvent.setup(), ...view };
}

describe('BottomSheet', () => {
  it('is a labelled modal dialog that takes focus', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Pick' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
  });

  it('closes with Escape and the close button', async () => {
    const { onClose, user } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps Tab inside the sheet', async () => {
    const { user } = setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Only action' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Only action' })).toHaveFocus();
  });

  it('locks page scrolling while open and restores it after', () => {
    const { unmount } = setup();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
