# CLAUDE.md — GearCard

You are building GearCard, an offline iPhone PWA field reference for one photographer's Nikon kit. Read `SPEC.md` fully before writing code; it is the product contract. `data/SCHEMA.md` defines the content. The screen mockups to match are plain HTML in `design/screens/` — open `design/screens/index.html` to see them all, and read each screen's HTML for exact spacing, colours and copy.

## Ground rules
- The JSON under `data/` is researched content with sources. Never change a number, verdict or menu path in it to make the UI easier. If data is missing or malformed, surface it (validation warning, "not researched" label) rather than inventing a value.
- The app must make zero network requests at runtime. Source links open externally only on tap.
- Derived values (diffraction bands, effective aperture, DOF, frame size, TC maths) live in `app/src/lib/optics.ts` as pure functions with unit tests using the worked examples in SPEC §6.
- Light theme by default; red Night theme as specified. No dark theme beyond Night.
- Keep the bundle small: Preact + TypeScript + Vite + vite-plugin-pwa. No UI framework, no chart library (the aperture strip is plain SVG/CSS).

## Commands to set up
```
npm create vite@latest app -- --template preact-ts
cd app && npm i && npm i -D vite-plugin-pwa vitest ajv tsx @playwright/test
```
Add scripts: `validate` (tsx ../scripts/validate-data.ts), `test` (vitest run), `build` (npm run validate && vite build), `preview`.

## Build order
1. `scripts/validate-data.ts` and `lib/data.ts` (load + index + validate). Run it against `data/` and fix only the code, not the data. Report data problems to the owner.
2. `lib/optics.ts` + tests.
3. Mounted screen + Lens Card (SPEC §5.1–5.2) — Phase 1 acceptance.
4. PWA config, then the airplane-mode test on an iPhone-size viewport.
5. Settings Explainer + Search (Phase 2).
6. TC toggle, Body Card, Night theme, Data & Sources (Phase 3).

## Owner preferences
Direct, dense UI copy. Prose over bullet clutter. Light backgrounds. Tell him plainly when data is low-confidence or missing.


## Versioning, release and hosting (same scheme as ClearSky, MyWeather and Studio Phone)
- `VERSION` (repo root) holds e.g. `1.4`. `npm run build` (in `app/`) validates data, typechecks, bumps the last part, builds one
  self-contained `index.html` with Vite (vite-plugin-singlefile) and copies it plus `sw.js`, `manifest.webmanifest` and the icons
  to the repo root, which GitHub Pages serves. `node ../scripts/build.mjs --version 2.0` pins a bigger version, `--no-bump` rebuilds as is.
- The page carries its version in `<meta name="app-version">`. The app probes the live page (`?u=<time>`, always network) 1.5 s after
  launch and whenever it returns to the foreground. At launch a newer version reloads at once (`?v=<version>`); later it shows an
  "Update now" banner. More → Version vX.Y checks on demand. Logic: `app/src/lib/update.ts`.
- `app/public/sw.js` is cache-first for the page (so the Home Screen app opens offline); `?u=` always hits the network, `?v=` fetches fresh and replaces the cache.
- Release: `npm run build`, commit (including the root `index.html`), `git push`. Size budget 260 KB gzipped (ClearSky's is 200; ~200 KB of this is the researched content).
- `npm run check` runs validation, typecheck and tests without bumping the version. The dev server (`npm run dev`) never registers the service worker or checks for updates.
