# Filament Tracker

Mobile-first installable web app (PWA) for tracking 3D printer filament spools and prints.
`DESIGN.md` is the source of truth for product behaviour. `PROGRESS.md` is the build log: milestones, decisions, known issues.

## Stack

TypeScript (strict) + React 18, Vite, Tailwind CSS, Dexie (IndexedDB) + dexie-react-hooks, React Router (`HashRouter`), vite-plugin-pwa, Vitest + Testing Library + fake-indexeddb, GitHub Actions to GitHub Pages.

No backend, analytics, accounts, or external API calls. The app must work fully offline once installed.

## Commands

- `npm run dev`: dev server
- `npm test`: run all tests once (`npm run test:watch` to watch)
- `npm run build`: type-check and production build into `dist/`
- `npm run preview`: serve the production build
- `npm run icons`: regenerate PNG app icons from `scripts/icon.svg`

## Folder structure

- `src/domain/`: pure functions and shared types (remaining grams, stock state, dial math, validation, photo sizing, base64). No React, no Dexie. Most heavily unit-tested.
- `src/db/`: the Dexie schema and **all** data access (repository functions and live-query hooks).
- `src/screens/<Screen>/`: one folder per screen.
- `src/components/<Component>/`: reusable UI, including the single `SpoolGraphic` SVG.
- `src/test/`: test setup and helpers.
- `.github/workflows/deploy.yml`: test, build, deploy to Pages on push to `main` or manually.

## Architecture rules

- Components never call Dexie directly. Everything goes through `src/db`.
- Remaining grams is **never stored**: `max(0, startGrams + adjustmentGrams - sum(usage))`, always computed.
- Saving, editing, and deleting a print each happen in **one Dexie transaction**. Do not `await` non-Dexie promises inside a transaction (encode or decode blobs outside it).
- Schema changes get a new Dexie `version(n)`, and `schemaVersion` in backups follows it.
- Add Print uses one shared draft state in the flow's layout route, so Back never loses input. It is mirrored to `sessionStorage` (without the photo) so a page reload doesn't lose it either.
- Vite `base` is `/filament-tracker/`, with `HashRouter` for routing.
- Strict TypeScript. No `any` without a comment giving the reason.
- Photos: compressed to at most 1280 px on the longest side, JPEG at about 0.8, stored as raw bytes (`photoData` ArrayBuffer + `photoType`), never as a `Blob`, because Safari loses or rejects Blobs in IndexedDB. The repository rebuilds a `Blob` on read.
- Dark theme by default, light follows the system. One accent colour. Colours are CSS variables in `src/index.css`.
- Never skip, weaken, or delete a test to make it pass.
- Keep dependencies to those in `DESIGN.md` plus small helpers noted in `PROGRESS.md`.
