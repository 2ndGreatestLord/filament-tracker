# Progress

## Milestones

- [x] M0: Scaffold and deploy pipeline. Build, tests, and workflow are done. "Placeholder live" depends on GitHub settings, see Known issues.
- [ ] M1: Data layer
- [ ] M2: Spool graphic and Filament tab
- [ ] M3: Add Filament flow
- [ ] M4: Add Print flow
- [ ] M5: Prints tab and detail screens
- [ ] M6: PWA and settings
- [ ] M7: Polish and handoff

## Decisions

- TypeScript is pinned to 5.9 rather than the brand-new 7.0, to keep the toolchain conservative.
- Tailwind v4 through `@tailwindcss/vite`, the current official setup.

## Known issues

## Could not verify

## Added dependencies (beyond DESIGN.md)

- `jsdom` (dev): the DOM environment Vitest needs for component tests.
- `@testing-library/user-event`, `@testing-library/jest-dom` (dev): part of the Testing Library family.
