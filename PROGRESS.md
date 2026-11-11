# Progress

## Milestones

- [x] M0: Scaffold and deploy pipeline. Build, tests, and workflow are done. "Placeholder live" depends on GitHub settings, see Known issues.
- [x] M1: Data layer. Schema, repository, domain math, and tests for remaining grams, low stock, and transactions.
- [x] M2: Spool graphic and Filament tab. Reusable SVG, grid, empty state, low-stock styling, component tests.
- [x] M3: Add Filament flow. Four selectors, optional details, validation, UI test through to the grid.
- [x] M4: Add Print flow. Name, slots, picker sheet, dial and input, photo step, save, and tests (2-filament print, dial math, Back keeps input).
- [x] M5: Prints tab and detail screens. History list, Print Detail (edit, delete, photo), Spool Detail (history, adjust, archive, delete rules), tests.
- [x] M6: PWA and settings. Manifest, icons, offline service worker, threshold, export, import, erase, backup round-trip test.
- [ ] M7: Polish and handoff

## Decisions

- TypeScript is pinned to 5.9 rather than the brand-new 7.0, to keep the toolchain conservative.
- Tailwind v4 through `@tailwindcss/vite`, the current official setup.

## Known issues

## Could not verify

## Added dependencies (beyond DESIGN.md)

- `jsdom` (dev): the DOM environment Vitest needs for component tests.
- `@testing-library/user-event`, `@testing-library/jest-dom` (dev): part of the Testing Library family.
