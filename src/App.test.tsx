import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/renderApp';

describe('App', () => {
  it('opens on the Filament tab with both tabs available', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Filament' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Filament' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prints' })).toBeInTheDocument();
  });
});
