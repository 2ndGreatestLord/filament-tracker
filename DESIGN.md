# Filament Tracker — Design Doc & Claude Code Build Plan

Nov 10, 2026 · @Ben

## Overview

We are building a phone app for one person: Ben's brother, who 3D prints. He uses it to keep a library of his filament spools and log each print. Every print subtracts the grams it used from the spools it drew from, so he always knows what's left.

Recommended approach: an **installable web app (PWA)** hosted free on **GitHub Pages**. He opens a link on his phone, taps "Add to Home Screen," and it then works like a normal app, offline included.

- **No App Store.** There's no $99/year Apple fee and no review process. Claude Code can do the whole build and deploy without anyone signing in partway through.
- **No server or accounts.** All data stays on his phone, in browser storage. Backup and restore is a JSON file he can export.
- **The tradeoff:** data doesn't sync between devices. If he wants sync later, it can be added as version 2.

The build runs overnight in **Claude Code on the web** (claude.ai/code). It works in its own cloud sandbox against a GitHub repo, so it keeps going after you close the laptop. One long prompt (Prompt 1) has it work through the milestones on its own and commit after each one. A short morning prompt (Prompt 2) reviews the result, fixes problems, and confirms the live link.

## Tonight's setup checklist

Setup takes about 15 minutes before bed. Do it on a laptop if you can. Watch the first few minutes of the build to make sure it starts cleanly, then go to sleep.

- [ ] **Create the repo.** On github.com, make a new **public** repository named `filament-tracker` and tick "Add a README." It needs to be public because GitHub Pages is free only for public repos on a free account.
- [ ] **Turn on Pages.** In the repo, open Settings → Pages → Build and deployment, and set Source to **GitHub Actions**.
- [ ] **Add this doc to the repo.** Use this doc's export menu to download it as Markdown. Then in the repo, choose Add file → Upload files, upload it, rename it `DESIGN.md`, and commit to `main`.
- [ ] **Start Claude Code.** Open claude.ai/code, connect GitHub if it asks, and select the `filament-tracker` repo. The default environment is fine because it can reach npm.
- [ ] **Paste Prompt 1** exactly as written below and send it.
- [ ] **Watch 5 minutes.** Check that it reads `DESIGN.md`, scaffolds the project, and makes its first commit. If it stops to ask you something, answer it and tell it not to ask again before morning.
- [ ] **Morning:** open the same session and read its summary, then paste Prompt 2. If it stopped partway, for example because it hit a usage limit, send `Continue from where you left off, following PROGRESS.md` first.

One caveat: an overnight run isn't guaranteed to finish. Usage limits or an error can pause it. That's why the prompt makes it commit after every milestone and keep a `PROGRESS.md` log, so nothing is lost and it can pick up where it stopped.

## Product spec

The app has two main screens, **Filament** and **Prints**, switched with a bottom tab bar, and two guided flows, Add Filament and Add Print. Numbered steps match the sketch.

### Home: Filament tab (the sketch's "Saved Filament")

- A grid of spool tiles, 2 columns on phones and more on wider screens. Each tile shows the spool graphic, with the filament showing through its holes in proportion to what's left, the remaining grams, and "PLA · Matte" style text.
- A tile turns amber below the low-stock threshold (default 100 g) and red at 0 g.
- The last tile is a **+** that starts Add Filament.
- Tapping a tile opens Spool Detail.

### Add Filament (steps 1–2)

- A **+ Add Filament** button opens a form with four selectors in the sketch's order:
  1. **Material:** PLA, PETG, ABS, ASA, TPU, Nylon, Other (Other shows a text box).
  2. **Finish:** Basic, Matte, Silk, Multicolor, Wood, Glow, Carbon Fiber, Other.
  3. **Color**, in two parts. There are no preset colors; every color is his own, either new or saved:
     - **Your colors for this material and finish.** Every material and finish combination keeps its own saved colors, so PLA · Basic, PLA · Matte, and PETG · Basic each have their own list. A color is saved there automatically the first time a spool is saved with it, and the app keeps all of them. One tap reuses a saved color, including its gradient, shine, and name. An Edit button removes saved colors, with Undo. Until a material and finish are chosen, this part says to choose them first.
     - **New color:** a custom color picker, "+ Gradient color" to add up to 3 more colors (4 in total) that blend across the spool, each removable, and a **Shiny** toggle that adds a sheen. Shine works on a single color or a gradient. A small spool preview shows the result, next to an optional color name such as "Jade White." A color is only named if he types a name.
     - **Pick from photo (eyedropper):** "Pick from photo" opens the camera, and "or use a saved photo" opens the photo library. The photo opens in a sheet. Tapping or dragging on it moves a circle, and the color under the circle is shown live with its hex code. The color is the median of a small area around the circle, not a single pixel, so glints, shadows, and gaps between strands don't throw it off. Arrow keys also move the circle. **Use this color** sets the color. **Add as gradient color** (once there's a color, and while there's room for another stop) adds it to the gradient, so a multicolor roll can be sampled one color at a time. The photo is only used to pick the color and is never saved.
  4. **Amount:** "New (1,000 g)" is selected by default. "Set…" shows a grams input for a partly used spool.
- An optional "More details" section, collapsed by default, holds brand, price paid, and a full spool size other than 1,000 g.
- Save adds the spool to the grid with a brief confirmation.

### Add Print (steps 3–7)

- **Step 3–4, Name and slots:** a Name field and **4 filament slots** shown as + boxes. Tapping a slot opens a bottom sheet with the saved-filament grid, including a + to add a new spool without leaving the flow. A filled slot shows that spool's color and label and can be cleared. **Next** is enabled once there's a name and at least one slot.
- **Step 5, Grams per filament:** one screen per filled slot, titled "Filament 1 of N." The center is a large spool graphic in that filament's color, which works like a wheel you spin, with no dial ring or handle. Dragging a finger around it turns the spool with the finger: clockwise adds grams, counterclockwise subtracts, one full turn = 100 g, at 1 g steps with a light haptic tick where supported. Like iOS scrolling, a **flick** keeps the spool spinning after the finger lifts, slowing smoothly to a stop. Flicking again in the same direction while it's still spinning adds to its speed, so repeated flicks go faster, up to a cap: one hard flick coasts at most about 135 g, so a few flicks can't race through a whole spool. Touching the spool while it spins stops it, and typing or the ±10 buttons also stop it. The spool never goes below 0 g. Under it, a pill-shaped grams input stays in sync with the dial so typing works too, with −10 and +10 buttons. A preview line reads "412 g left → 377 g after this print." If he enters more grams than the spool holds, show a warning but allow it, and treat the spool as reaching 0 g.
- **Step 6:** repeat step 5 for each filled slot, with Back available.
- **Step 7, Photo:** a dashed photo frame. Tapping it opens the phone camera or photo library. Then Save, **Skip** (no photo), or **Save later** (saves the print with a "photo needed" badge so a photo can be added from Print Detail). Photos are shrunk to about 1280 px before they're stored.
- Saving subtracts the grams from each spool and returns to the Prints tab with the new print on top.

### Home: Prints tab

A list of prints, newest first. Each row shows a photo thumbnail or placeholder (never a broken image), the name, the date, total grams, and a colored dot for each filament used. Tapping a row opens Print Detail.

### Detail and settings screens

- **Spool Detail:** a large spool graphic with grams remaining and used, the spool's attributes, its usage history (prints that used it), Edit, "Adjust remaining" (for correcting after weighing the spool), Archive (hides it from pickers), and Delete. Delete is blocked while prints reference the spool; archive is offered instead.
- **Print Detail:** the photo, the filaments and grams used, Edit grams (re-calculates the spools), Add/Replace photo, and Delete (asks first, then gives the grams back to the spools).
- **Settings:** low-stock threshold, Export backup (downloads JSON with photos included), Import backup, and Erase all data (requires typing ERASE).

## Data model

There are four tables in IndexedDB. **Remaining grams is never stored.** It's always calculated from the spool's starting weight minus its usage, so editing or deleting a print can't leave a spool's count out of step.

| Table | Field | Type | Notes |
| --- | --- | --- | --- |
| spools | id | string (UUID) | primary key |
| spools | material | string | PLA, PETG, … or custom text |
| spools | finish | string | Basic, Matte, … or custom text |
| spools | colorHex / colorName | string / string? | hex drives every spool graphic; the first gradient color when there's a gradient |
| spools | colorStops | string[]? | 2–4 hex colors for a gradient, the first equal to colorHex; absent for a single color |
| spools | shiny | boolean? | true adds a sheen |
| spools | startGrams | number | 1000 for "New"; the typed value for "Set…" |
| spools | adjustmentGrams | number | default 0; set by "Adjust remaining" after weighing |
| spools | brand / price / spoolSizeGrams | string? / number? / number? | optional details |
| spools | archived, createdAt, updatedAt | boolean, ISO dates |  |
| prints | id | string (UUID) | primary key |
| prints | name | string | required |
| prints | photoData / photoType | ArrayBuffer? / string? | the compressed JPEG's bytes and MIME type (see below) |
| prints | photoPending | boolean | true after "Save later" |
| prints | createdAt, updatedAt | ISO dates |  |
| printFilaments | id | string (UUID) | primary key |
| printFilaments | printId / spoolId | string / string | indexed |
| printFilaments | slot | 1–4 | order shown in the flow |
| printFilaments | grams | number | at least 0; decimals allowed |
| colors | id | string (UUID) | primary key |
| colors | material / finish | string / string | compound index `[material+finish]`; one saved list per combination |
| colors | colorHex / colorStops / shiny / name | as on spools | the saved look |
| colors | createdAt | ISO date | list order |

The calculation:

```latex
\text{remaining} = \max\left(0,\ \text{startGrams} + \text{adjustmentGrams} - \sum \text{grams used in prints}\right)
```

The database schema is versioned with Dexie `version(n)` so later releases can migrate saved data without losing anything. The backup JSON carries a `schemaVersion`, and photos are encoded as base64 strings.

- **Schema version 2** added the `colors` table. Upgrading from version 1 fills each material and finish's saved colors from the existing spools. Backups now include the saved colors. Backups from version 1 still import, and their saved colors are rebuilt from their spools the same way.
- **Photos are stored as raw bytes, not as a `Blob`.** Safari and iOS can fail to store a `Blob` in IndexedDB, or lose its data later, which showed up as a print's photo turning into a broken image after doing something else. The app rebuilds a `Blob` from the bytes when it reads a print. At startup, any photo still saved as a `Blob` is converted, and a photo that can no longer be read marks its print "Photo needed" instead of showing as broken.

## Tech stack and architecture

The stack below is chosen so Claude Code can build, test, and deploy it without help: common, well-documented tools, no backend, and no API keys.

| Layer | Choice | Why |
| --- | --- | --- |
| Language / UI | TypeScript + React 18 | Large, stable ecosystem, and Claude Code is strongest here |
| Build | Vite | Fast; static output fits GitHub Pages |
| Styling | Tailwind CSS | Quick, consistent mobile layouts |
| Storage | Dexie (IndexedDB) + dexie-react-hooks | Saves data and photos on the device; screens update live |
| Routing | React Router with **HashRouter** | Avoids 404s on GitHub Pages when a page is refreshed |
| Installable / offline | vite-plugin-pwa | Manifest, icons, and service worker for offline use |
| Tests | Vitest + Testing Library + fake-indexeddb | Unit and component tests that run in the sandbox |
| Deploy | GitHub Actions → GitHub Pages | Free; deploys on every push to `main` |

Architecture rules for Claude Code:

- `src/db/`: the Dexie schema plus **all** data access through a small repository layer, such as `addPrint()` and `getSpoolRemaining()`. Components never call Dexie directly.
- `src/domain/`: pure functions for remaining grams, low-stock state, dial angle-to-grams math, spin momentum, the reel's geometry, colors (gradients, shine, saved palettes), and sampling a color from a photo. These are the most heavily unit-tested code.
- `src/screens/` and `src/components/`: one folder per screen. Add Print uses one shared draft state, so Back doesn't lose input.
- Saving a print writes the print and its filament rows in **one Dexie transaction**.
- Vite `base` must be `/filament-tracker/` so assets load on GitHub Pages.

## UI and visual design

The app should feel like a clean, modern phone app, built around a dark theme. The spool graphic, a dark Bambu Lab–style reel with the filament showing through its holes, is its visual signature.

- **Phone first:** designed at 375–430 px width, usable one-handed. Main buttons sit in the bottom third of the screen and are at least 44 px tall.
- **Theme:** dark by default with a light theme that follows the system setting. One accent color. The filament colors themselves supply the rest of the color.
- **Spool graphic:** a single reusable SVG component modeled on a Bambu Lab reel: a dark plate with a dense square grid of round holes (largest mid-way out, smaller toward the hub and rim), a solid hub ring, an open center hole, a pill-shaped label pad on the left, and small notches in the rim. The filament is a disc of its color behind the plate, so it shows **only through the holes**, never in the center hole. The disc's area is proportional to the fraction remaining, so a full spool fills every hole and an empty one shows none. Gradients run across the filament, and shiny filament gets a sheen. There's no separate progress ring. The component takes the color (with gradient and shine), the fraction remaining, and a rotation, and it appears on tiles, in the picker, on the grams screen, and on detail screens.
- **Grams spool:** the spool itself rotates with the grams (one turn = 100 g) as it's dragged or coasting after a flick, tracks multiple full turns, never goes below 0, and has no handle or dial ring.
- **Feedback:** short confirmation toasts, and Undo for 5 seconds after any delete.
- **Empty states:** a friendly prompt such as "No filament yet, add your first spool" with the + button.
- **Accessibility:** color is never the only signal (tiles also say "Low" in words), every color dot has a label, the dial has a matching text input, and the photo eyedropper works with arrow keys and announces the picked color.
- **App icon:** a simple spool icon generated as SVG and exported to the PNG sizes the PWA needs.

## Milestones

There are eight milestones, done in order. Each one ends with tests passing, a build that succeeds, a commit, and an update to `PROGRESS.md`.

1. **M0, Scaffold and deploy pipeline:** Vite + React + TS + Tailwind + Router + Vitest set up, and a GitHub Actions workflow deploying to Pages.
   - Done when: `npm run build` and `npm test` pass, the workflow file exists, and a placeholder page is live.
2. **M1, Data layer:** Dexie schema, repository functions, and domain math.
   - Done when: unit tests cover remaining grams (including after a print is edited or deleted), the low-stock threshold, and the transactional print save.
3. **M2, Spool graphic and Filament tab:** the reusable spool component, grid, empty state, and low-stock styling.
   - Done when: component tests render tiles with correct grams and status.
4. **M3, Add Filament flow:** all four selectors, optional details, and validation.
   - Done when: adding a spool through the UI makes it appear in the grid.
5. **M4, Add Print flow:** name, 4 slots, the picker sheet, per-filament grams screens with dial and text input, the photo step with Skip and Save later, and saving.
   - Done when: a test adds a 2-filament print and both spools drop by the right amounts. The dial math has its own tests.
6. **M5, Prints tab and detail screens:** history list, Print Detail (edit, delete, photo), and Spool Detail (history, adjust, archive).
   - Done when: deleting a print gives the grams back, and editing grams recalculates.
7. **M6, PWA and settings:** manifest, icons, offline service worker, threshold setting, export, import, and erase.
   - Done when: a backup exported then imported into an empty database reproduces the same data, verified by a test.
8. **M7, Polish and handoff:** accessibility pass, Undo toasts, light/dark themes, a README with install steps for iPhone and Android, and a final deploy.
   - Done when: Lighthouse PWA and accessibility checks show no major failures, if Lighthouse runs in the sandbox, and `PROGRESS.md` lists everything it couldn't verify.

If time runs short, M0 through M4 make a working app. M5 through M7 make it a complete one.

## Prompt 1: overnight build

Paste everything in the box into Claude Code as one message. It's written to run unattended: it tells Claude not to wait for answers, to make sensible calls, and to log every decision.

```text
You are the sole developer building "Filament Tracker," a mobile-first installable web app (PWA) for tracking 3D printer filament spools and prints. The full specification is in DESIGN.md at the repo root. Read all of it before writing any code. DESIGN.md is the source of truth. Ignore its "Tonight's setup checklist" and "Prompt" sections; they are instructions for me, not for you.

I am asleep and cannot answer questions until morning. Work autonomously through every milestone in DESIGN.md (M0 to M7) without stopping to ask me anything. When the spec is ambiguous, choose the simplest reasonable option that matches the spec's intent, record the decision in PROGRESS.md under "Decisions," and keep going.

Setup, first:
1. Create CLAUDE.md summarizing the stack, folder structure, architecture rules, and commands (dev, test, build) from DESIGN.md, so any future session can pick up the work.
2. Create PROGRESS.md with a checklist of M0 to M7 and sections for "Decisions," "Known issues," and "Could not verify."

For each milestone, in order:
1. Implement it exactly as DESIGN.md specifies (Product spec, Data model, Tech stack, UI, Milestones).
2. Write the tests named in that milestone's "Done when" criteria. Run `npm test` and `npm run build` and fix every failure before moving on. Never skip, weaken, or delete a test to make it pass.
3. Update PROGRESS.md: tick the milestone and add notes.
4. Commit with a clear message ("M2: spool graphic and Filament tab") and push to main.

Hard requirements:
- TypeScript strict mode. No `any` unless commented with a reason.
- Vite `base: '/filament-tracker/'` and HashRouter, so the app works on GitHub Pages.
- Deploy workflow at .github/workflows/deploy.yml using actions/upload-pages-artifact and actions/deploy-pages, triggered on push to main and manually (workflow_dispatch).
- Remaining grams is always computed (startGrams + adjustmentGrams - sum of usage, floored at 0) and never stored.
- Saving, editing, and deleting a print each happen in a single Dexie transaction.
- All database access goes through src/db repository functions. Pure math lives in src/domain with unit tests.
- The grams dial: dragging around the spool changes grams (clockwise adds, 1 full turn = 100 g, 1 g steps, minimum 0), kept in sync with a numeric input and -10/+10 buttons. Put the angle math in a pure, tested function and support touch and mouse via pointer events.
- Photos: use <input type="file" accept="image/*" capture="environment">, shrink to at most 1280 px on the longest side as JPEG at about 0.8 quality, and store as a Blob.
- No backend, no analytics, no external API calls, no accounts. The app must work fully offline once installed.
- Keep dependencies to those listed in DESIGN.md plus small, well-maintained helpers only when clearly needed. Note any addition in PROGRESS.md.

If you get stuck on one problem for a long time, document it under "Known issues," make the smallest workaround that keeps the app usable, and move on. Finishing M0-M4 solidly matters more than starting M7 half-done.

When everything is finished, or you can go no further, finish by:
- Running the full test suite and a production build one last time.
- Making sure the latest code is pushed to main so the Pages workflow deploys it.
- Writing a short "Morning summary" at the top of PROGRESS.md: what's done, the expected live URL (https://<github-username>.github.io/filament-tracker/), what I need to do or check, and anything you could not verify, such as real-phone camera or install behavior.
```

## Prompt 2: morning review and launch

Paste this into the same session after reading its summary.

```text
Good morning. Before calling the app done, review your own work with fresh eyes, as if you were a senior engineer seeing this repo for the first time:

1. Re-read DESIGN.md and compare it line by line with what was built. List every gap or difference in PROGRESS.md, then fix them, smallest first.
2. Walk through these scenarios in code and tests and fix anything broken:
   - Add 2 spools, log a 2-filament print, check both spools' remaining grams, edit the print's grams, delete the print, and confirm the grams come back.
   - Use more grams than a spool has: a warning shows and remaining stops at 0.
   - Press Back mid-way through Add Print: nothing typed is lost.
   - Export a backup, erase all data, import the backup: everything returns, photos included.
3. Check the GitHub Actions run for the latest push. If the deploy failed, read the logs and fix it. Confirm the live URL loads the app with no console errors and that assets load under /filament-tracker/.
4. Run the tests and build once more, commit, and push.
5. Reply to me with: the live URL, a 5-line summary of what the app does, anything still unfinished, and step-by-step instructions I can text my brother for adding it to his iPhone or Android home screen.
```

After your brother tries it, send his feedback in a new message:

```text
My brother tested the app. His feedback is below. Make each change and keep DESIGN.md up to date as the spec. Add tests for any behavior that changes, then commit and push.

<paste his feedback here>
```

## Open questions for your brother

The build assumes the answers in parentheses. None of them blocks tonight's run, and each is easy to change afterward with the feedback prompt.

- [ ] Is the curved arrow around the spool in step 5 a dial you spin to set grams? (Assumed yes, with typing as a backup.)
- [ ] Do the 4 filament slots match a 4-spool system such as a Bambu AMS, and what printer is it?
- [ ] Where does he get the grams for a print: the slicer's estimate, or weighing the spool? (Both are supported: typed grams per print, plus "Adjust remaining" after weighing.)
- [ ] What does "Save later" mean: add the photo later, or save the whole print as a draft? (Assumed add the photo later.)
- [ ] Does he care about cost per print? (Price is an optional field. Cost per print isn't shown yet.)
- [ ] At what weight should a spool count as running low? (Default 100 g.)
- [ ] Will he only use it on one phone? (Assumed yes. Syncing across devices would be version 2.)
