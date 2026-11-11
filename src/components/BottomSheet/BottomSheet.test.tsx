import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('closes only the top sheet when one is open on another', async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    function Nested() {
      const [open, setOpen] = useState(false);
      return (
        <BottomSheet title="Outer" onClose={outer}>
          <button type="button" onClick={() => setOpen(true)}>
            Open inner
          </button>
          {open && (
            <BottomSheet title="Inner" onClose={inner}>
              <button type="button">Inner action</button>
            </BottomSheet>
          )}
        </BottomSheet>
      );
    }
    render(<Nested />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(screen.getByRole('dialog', { name: 'Inner' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('unlocks page scrolling once every stacked sheet has closed, in any order', () => {
    const { rerender, unmount } = render(
      <BottomSheet title="Outer" onClose={() => undefined}>
        <BottomSheet title="Inner" onClose={() => undefined}>
          x
        </BottomSheet>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <BottomSheet title="Outer" onClose={() => undefined}>
        x
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');

    // Both at once, as when leaving the screen with a sheet open on another.
    const both = render(
      <BottomSheet title="Outer" onClose={() => undefined}>
        <BottomSheet title="Inner" onClose={() => undefined}>
          x
        </BottomSheet>
      </BottomSheet>,
    );
    both.unmount();
    expect(document.body.style.overflow).toBe('');
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
