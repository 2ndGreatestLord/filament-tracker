import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { filamentRadius, REEL } from '../../domain/reel';
import { SpoolGraphic } from './SpoolGraphic';

const filamentOf = (container: HTMLElement) => container.querySelector('[data-part="filament"]');

describe('SpoolGraphic', () => {
  it('draws filament in its color behind a reel with holes', () => {
    const { container } = render(<SpoolGraphic paint={{ colorHex: '#00ff00' }} fraction={0.5} />);
    expect(filamentOf(container)).toHaveAttribute('stroke', '#00ff00');
    expect(container.querySelector('mask path')?.getAttribute('d')?.length).toBeGreaterThan(1000);
  });

  it('sizes the filament to how much is left, from the barrel outward', () => {
    const { container } = render(<SpoolGraphic paint={{ colorHex: '#00ff00' }} fraction={0.25} />);
    const ring = filamentOf(container)!;
    const r = Number(ring.getAttribute('r'));
    const width = Number(ring.getAttribute('stroke-width'));
    expect(r - width / 2).toBeCloseTo(REEL.filamentCore);
    expect(r + width / 2).toBeCloseTo(filamentRadius(0.25));
  });

  it('keeps filament out of the centre hole', () => {
    const { container } = render(<SpoolGraphic paint={{ colorHex: '#00ff00' }} fraction={1} />);
    const ring = filamentOf(container)!;
    const inner = Number(ring.getAttribute('r')) - Number(ring.getAttribute('stroke-width')) / 2;
    expect(inner).toBeGreaterThan(REEL.centerHole);
  });

  it('shows no filament when empty and clamps above full', () => {
    const empty = render(<SpoolGraphic paint={{ colorHex: '#00ff00' }} fraction={0} />);
    expect(filamentOf(empty.container)).toBeNull();
    const over = render(<SpoolGraphic paint={{ colorHex: '#00ff00' }} fraction={1.5} />);
    expect(over.container.querySelector('svg')).toHaveAttribute('data-fraction', '1');
  });

  it('paints a gradient across the filament', () => {
    const { container } = render(
      <SpoolGraphic
        paint={{ colorHex: '#ff0000', colorStops: ['#ff0000', '#ffd700', '#0000ff'] }}
        fraction={1}
      />,
    );
    const stops = [...container.querySelectorAll('linearGradient stop')].map((s) =>
      s.getAttribute('stop-color'),
    );
    expect(stops).toEqual(['#ff0000', '#ffd700', '#0000ff']);
    expect(filamentOf(container)?.getAttribute('stroke')).toMatch(/^url\(#.+-paint\)$/);
  });

  it('adds a sheen only when shiny', () => {
    const flat = render(<SpoolGraphic paint={{ colorHex: '#c0c0c0' }} fraction={1} />);
    expect(flat.container.querySelector('[data-part="sheen"]')).toBeNull();
    const shiny = render(<SpoolGraphic paint={{ colorHex: '#c0c0c0', shiny: true }} fraction={1} />);
    expect(shiny.container.querySelector('[data-part="sheen"]')).not.toBeNull();
  });

  it('turns the reel and filament, but not the sheen', () => {
    const { container } = render(
      <SpoolGraphic paint={{ colorHex: '#c0c0c0', shiny: true }} fraction={1} rotation={90} />,
    );
    expect(container.querySelector('[data-part="reel"]')).toHaveAttribute(
      'transform',
      'rotate(90 50 50)',
    );
    expect(filamentOf(container)?.parentElement).toHaveAttribute('transform', 'rotate(90 50 50)');
    expect(container.querySelector('[data-part="sheen"]')?.parentElement?.tagName).toBe('svg');
  });

  it('gives each spool its own mask, so several can share a screen', () => {
    const { container } = render(
      <>
        <SpoolGraphic paint={{ colorHex: '#000000' }} fraction={1} />
        <SpoolGraphic paint={{ colorHex: '#000000' }} fraction={1} />
      </>,
    );
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('is labelled when given a title and hidden otherwise', () => {
    const { container } = render(
      <>
        <SpoolGraphic paint={{ colorHex: '#000000' }} fraction={1} title="Black spool" />
        <SpoolGraphic paint={{ colorHex: '#000000' }} fraction={1} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Black spool' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
  });
});
