import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, UNDO_MS, useToast } from './Toast';

function Harness({ undo }: { undo?: () => void }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast('Deleted', undo ? { undo } : undefined)}>
      Go
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toasts', () => {
  it('offers Undo for 5 seconds, then disappears', () => {
    render(
      <ToastProvider>
        <Harness undo={vi.fn()} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(UNDO_MS).toBe(5000);

    act(() => void vi.advanceTimersByTime(4900));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.queryByText('Deleted')).toBeNull();
  });

  it('runs the undo action once', async () => {
    const undo = vi.fn();
    render(
      <ToastProvider>
        <Harness undo={undo} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Restored')).toBeInTheDocument();
  });

  it('announces through a live region and has no Undo for plain messages', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('status')).toHaveTextContent('Deleted');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
