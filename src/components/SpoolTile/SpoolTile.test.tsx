import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { SpoolWithRemaining } from '../../db/repository';
import { SpoolTile } from './SpoolTile';

function spool(remaining: number): SpoolWithRemaining {
  return {
    id: 'a',
    material: 'PLA',
    finish: 'Matte',
    colorHex: '#ff0000',
    colorName: 'Red',
    startGrams: 1000,
    adjustmentGrams: 0,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    remaining,
    used: 1000 - remaining,
  };
}

function renderTile(remaining: number, threshold = 100) {
  return render(
    <MemoryRouter>
      <SpoolTile spool={spool(remaining)} threshold={threshold} to="/filament/a" />
    </MemoryRouter>,
  );
}

describe('SpoolTile', () => {
  it('shows grams, material, finish, and no status when stocked', () => {
    renderTile(412);
    expect(screen.getByText('412 g')).toBeInTheDocument();
    expect(screen.getByText('PLA · Matte')).toBeInTheDocument();
    expect(screen.queryByText('Low')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('data-status', 'ok');
  });

  it('says Low and turns amber below the threshold', () => {
    renderTile(99);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('data-status', 'low');
    expect(screen.getByRole('link')).toHaveClass('border-warn');
  });

  it('says Empty and turns red at 0 g', () => {
    renderTile(0);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveClass('border-danger');
  });

  it('follows a custom threshold', () => {
    renderTile(150, 200);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('draws the ring as a fraction of the full spool', () => {
    const { container } = renderTile(250);
    expect(container.querySelector('svg')).toHaveAttribute('data-fraction', '0.25');
  });
});
