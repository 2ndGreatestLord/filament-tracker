# Progress

## Summary

**The app is live at https://2ndgreatestlord.github.io/filament-tracker/** and serves the latest build. It loads in Edge and WebKit with no console errors, and every asset loads from under `/filament-tracker/`.

- Built: M0 to M7, plus feedback round 1 (below). All tests pass and the production build succeeds.
- The repo was renamed to `filament-tracker`, which fixed the blank page caused by the case mismatch with Vite's `base`.
- Still to check on a real phone: camera and photo library, Add to Home Screen, how flicking the spool feels, and photos surviving on iPhone (see "Could not verify").

## Morning review (spec vs. build)

DESIGN.md was compared line by line with the code. Gaps and differences, smallest first, with what was done:

1. A test title still said photos are saved "as a Blob", which is no longer true. Renamed. *Fixed.*
2. Print Detail's Edit grams didn't warn when the new grams were more than the spool holds, unlike step 5. It now shows the same warning, and the spool still stops at 0 g. *Fixed, with a test.*
3. The walkthrough "add 2 spools, log a 2-filament print, check both, edit, delete, grams come back" was covered only in pieces. A single UI test now runs it end to end, from the Add Filament form to the Filament tab. *Fixed.*
4. Prompt 1's hard requirement says to store photos as a `Blob`. They're stored as raw bytes instead, because Safari can't keep Blobs in IndexedDB (feedback item 4). DESIGN.md's data model documents this. *Deliberate difference.*
5. The spec says archiving hides a spool from pickers. It's also hidden from the home grid, with a "Show archived" toggle. *Deliberate, see Decisions.*
6. The low-stock threshold lives in `localStorage`, not IndexedDB, and is included in backups. *Deliberate, see Decisions.*
7. Step 7 says tapping the frame opens "the camera or photo library". `capture="environment"` goes straight to the camera on most phones, so there's also a "Choose from library" link. *Deliberate, see Decisions.*
8. The "light haptic tick" can't happen on iPhone, because Safari has no vibration API. *Platform limit.*
9. Lighthouse has no PWA category any more, so installability was checked with the browser's own check. *Tool limit.*

Scenarios walked through in code and tests, all passing:

- Two spools, a 2-filament print, edit, and delete: `src/screens/PrintDetail/PrintLifecycle.test.tsx`, plus transaction and rollback tests in `src/db/repository.test.ts`.
- Using more grams than a spool has: warning and 0 g floor, in `AddPrintFlow.test.tsx`, `PrintDetailScreen.test.tsx`, and `repository.test.ts`.
- Back mid-way through Add Print keeps everything, including after a reload: `AddPrintFlow.test.tsx`.
- Export, erase, and import bring everything back, photos and saved colors included: `src/db/backup.test.ts` and `SettingsScreen.test.tsx`.

## Milestones

- [x] M0: Scaffold and deploy pipeline. Build, tests, and workflow are done, and the Pages deploy succeeds. The live URL works since the repo rename.
- [x] M1: Data layer. Schema, repository, domain math, and tests for remaining grams, low stock, and transactions.
- [x] M2: Spool graphic and Filament tab. Reusable SVG, grid, empty state, low-stock styling, component tests.
- [x] M3: Add Filament flow. Four selectors, optional details, validation, UI test through to the grid.
- [x] M4: Add Print flow. Name, slots, picker sheet, dial and input, photo step, save, and tests (2-filament print, dial math, Back keeps input).
- [x] M5: Prints tab and detail screens. History list, Print Detail (edit, delete, photo), Spool Detail (history, adjust, archive, delete rules), tests.
- [x] M6: PWA and settings. Manifest, icons, offline service worker, threshold, export, import, erase, backup round-trip test.
- [x] M7: Polish and handoff. Accessibility pass, Undo toasts, themes, README, Lighthouse, final deploy.

## Decisions

Tooling

- TypeScript is pinned to 5.9 rather than the brand-new 7.0, to keep the toolchain conservative.
- Tailwind v4 through `@tailwindcss/vite`, the current official setup.
- The deploy workflow runs the tests before building, so a failing test blocks a deploy.

Data

- The low-stock threshold is stored in `localStorage` through `src/db/settings.ts`, because the original spec defined exactly three IndexedDB tables. It's included in backups.
- Import replaces all existing data, after a confirmation. It validates the whole file first and writes in one transaction, so a bad file can't damage anything.
- Erase all data has no Undo. Typing ERASE is its safeguard. Undo covers deleting a spool or a print.
- The app asks the browser for persistent storage at startup, to reduce the chance of the data being evicted.

Spools

- A "New" spool starts at its full size: 1,000 g, or the "full spool size" from More details if one is given.
- The full mark for the fraction shown on the spool is the spool size if given, otherwise the larger of 1,000 g and the starting weight.
- Material, finish, and color must be chosen. Only Amount has a default, as the spec says.
- A preset color's name is saved as the color name unless another name is typed.
- Set… can't exceed a typed full spool size.
- Archived spools are hidden from the pickers and from the home grid, with a "Show archived" toggle under the grid so they can be reached and unarchived.
- Deleting an unused spool happens immediately, with Undo. Only deleting a print asks first, as the spec says.

Add Print

- A spool can occupy only one slot in a print. It shows as "Already in a slot" in the picker.
- Tapping a filled slot opens the picker to replace it. The × clears it.
- Each step has its own route, so the phone's Back gesture moves through the steps. The draft lives in the flow's layout.
- The draft is also kept in `sessionStorage` without the photo, because phones can discard the page while the camera is open. Leaving the flow clears it.
- Grams may be 0, because the spec's minimum is 0.
- `capture="environment"` opens the camera directly on most phones and skips the photo library, while the spec wants both. The dashed frame uses `capture` as required, and a separate "Choose from library" link uses a plain file input.
- After a photo is picked, Skip and Save later are hidden, and "Remove photo" brings them back.

Navigation

- Settings is a gear icon at the top right of both tabs, since the tab bar has only the two main screens.

## Feedback round 1 (from testing)

All six items from the first round of testing are done, tested, and in DESIGN.md.

1. **Spool look.** The graphic now copies the Bambu Lab reel in the reference photo: a square grid of holes, solid hub ring, center hole, pill-shaped label pad, and rim notches. The plate stays dark, as the original spec's "black reel" said.
2. **iOS-style flicking.** The grams screen is now a spool you spin, with no dial ring or handle. A flick coasts and slows with exponential friction (time constant 450 ms). Flicking again in the same direction adds to the current speed, capped at 0.3 g/ms, so one flick coasts at most about 135 g. Touching the spool stops it.
3. **Spinning, and filament showing through the holes.** The reel rotates with the grams (one turn = 100 g). The filament is a disc behind the plate, so it shows only through the holes and never in the center hole. Its area is proportional to the amount left. The old outer progress ring is removed everywhere, since the filament now shows the amount left.
4. **Photo breaking after doing something else.** Root cause: WebKit (Safari, and every browser on iPhone) can't reliably keep a `Blob` in IndexedDB. In WebKit testing, saving a print with a photo failed outright, and iOS is known to lose Blob data later. Photos are now stored as raw bytes (schema version 2), existing Blob photos are converted at startup, and an image that still fails to load shows the placeholder instead of a broken icon.
5. **Colors per material and finish.** A new `colors` table keeps a saved list for each material and finish combination. Every new color is saved automatically when a spool is saved, and can be removed with Undo. Upgrading fills the lists from existing spools, and backups include them.
6. **Gradients and shine.** A color can be a gradient of up to 4 colors, shiny, or both. Shine is a sheen that doesn't rotate with the spool, so it reads like light on the filament.

Checked in real browsers: headless Edge and Playwright WebKit both passed 14 checks against the production build. The checks covered per-combination palettes, no handle, a slow drag landing on exactly 25 g with the reel turned 90°, flick coasting and stopping, a moderate flick distance, repeated flicks going further, and a photo surviving save, adding a filament, Print Detail, and reload, with no console errors.

## Known issues

- A photo picked during Add Print is lost if the page is reloaded before saving. Everything else in the draft survives.
- Lighthouse has no PWA category any more (removed in version 12). Installability was checked instead through the browser's own check, which reported no errors.

## Could not verify

- Anything on a real phone: camera capture, the photo library, Add to Home Screen, and how the dial feels.
- Safari on a real iPhone. Browser checks ran in Edge and in Playwright's WebKit on Windows, which is close to Safari but not the same. Worth watching on iPhone: Export backup from the installed app, and safe-area spacing around the notch.
- How flicking feels on a real iPhone. The momentum constants are in `src/domain/momentum.ts` if it needs tuning.
- The photo fix on a real iPhone. WebKit on Windows reproduced the failure and confirmed the fix, but it isn't iOS Safari itself.
- Haptics. The code calls `navigator.vibrate`, which Android Chrome supports and iOS doesn't. A unit test confirms the call is made, but not that it feels right.

## Added dependencies (beyond DESIGN.md)

- `jsdom` (dev): the DOM environment Vitest needs for component tests.
- `@testing-library/user-event`, `@testing-library/jest-dom`, `@testing-library/dom` (dev): part of the Testing Library family.
- `@resvg/resvg-js` (dev): renders the app icon SVG to PNGs, in `npm run icons`.
- `@types/react`, `@types/react-dom`, `@types/node` (dev): type definitions.
