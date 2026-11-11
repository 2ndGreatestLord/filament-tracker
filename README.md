# Filament Tracker

A phone app for keeping a library of 3D printer filament spools and logging each print. Every print subtracts the grams it used from its spools, so you always know what's left.

It's an installable web app. There's no account and no server. All data stays on your phone and works offline.

**Open it:** https://2ndgreatestlord.github.io/filament-tracker/

## Install on iPhone

1. Open the link above in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **Filament** from your home screen.

## Install on Android

1. Open the link above in **Chrome**.
2. Tap the **⋮** menu at the top right.
3. Tap **Add to Home screen** or **Install app**, then confirm.
4. Open **Filament** from your home screen.

## Keep your data safe

Your spools and prints live only on this phone. Now and then, open **Settings** (the gear at the top right) and tap **Export backup** to save a file you can restore later with **Import backup**. Uninstalling the app or clearing browser data deletes everything that isn't backed up.

## Development

```sh
npm install
npm run dev     # dev server
npm test        # all tests
npm run build   # type-check and production build
npm run icons   # regenerate the PNG icons from scripts/icon.svg
```

Pushing to `main` tests, builds, and deploys to GitHub Pages. `DESIGN.md` is the spec, `CLAUDE.md` covers the architecture, and `PROGRESS.md` is the build log.
