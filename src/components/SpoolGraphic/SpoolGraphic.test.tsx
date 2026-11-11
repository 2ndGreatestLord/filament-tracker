import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpoolGraphic } from './SpoolGraphic';

describe('SpoolGraphic', () => {
  it('uses the filament colour on the reel', () => {
    const { container } = render(<SpoolGraphic colorHex="#00ff00" fraction={0.5} />);
    expect(container.querySelectorAll('circle[fill="#00ff00"]').length).toBeGreaterThan(5);
  });

  it('draws the ring for the fraction remaining', () => {
    const { container } = render(<SpoolGraphic colorHex="#00ff00" fraction={0.25} />);
    expect(container.querySelector('circle[stroke="#00ff00"]')).toHaveAttribute(
      'stroke-dasharray',
      '0.25 1',
    );
  });

  it('draws no ring when empty and clamps above full', () => {
    const empty = render(<SpoolGraphic colorHex="#00ff00" fraction={0} />);
    expect(empty.container.querySelector('circle[stroke="#00ff00"]')).toBeNull();
    const over = render(<SpoolGraphic colorHex="#00ff00" fraction={1.5} />);
    expect(over.container.querySelector('svg')).toHaveAttribute('data-fraction', '1');
  });

  it('is labelled when given a title and hidden otherwise', () => {
    const { container } = render(
      <>
        <SpoolGraphic colorHex="#000000" fraction={1} title="Black spool" />
        <SpoolGraphic colorHex="#000000" fraction={1} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Black spool' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
  });
});
