# GearCard — Product & Build Spec (v1)

> **v1.5 update (2026-11-05):** the per-body diffraction bands (§5.2 B body track, §6.1, the Body Card table) were replaced by per-lens sharpness curves. Data: `data/lens-curves.json` (schema in `data/README.md`); logic: `app/src/lib/curves.ts`; change brief: `gearcard-diffraction-update.md`. Where this spec still mentions bands, the curve model wins.

*Owner: Bhanu Suryadevara · Spec date: 2026-11-05 · Build target: Claude Code · Content: 25 lenses, 3 bodies, 2 accessories, 81 settings*

GearCard is an offline iPhone web app that answers, in the field and in under five seconds, "I just mounted this lens on this body — where is it sharp, where does diffraction start, how close can I get and at what aperture is it best up close?" A second module explains camera settings for the three Z bodies. Every verdict comes from researched sources, shown as one consensus answer with the evidence one tap away.

Everything needed to build it is in this folder: this spec, `CLAUDE.md` (build instructions for Claude Code), `data/` (all researched content as JSON), `design/` (screen mockups), and `docs/` (research notes and the computed reference tables).

---

## 1. Goals and non-goals

Goals for v1
1. Lens Card for any owned lens × owned body combination: per-lens sharpness curve (peak and drop-off by aperture, per focal length for zooms), close-up block (minimum focus distance, maximum magnification, frame width at max magnification on this body, effective aperture, best close-up aperture, close-up depth of field).
2. Teleconverter toggle for compatible lenses (Z TC-1.4x): recompute focal length, aperture and magnification, and show the with-converter curve in displayed f-numbers.
3. Body Card: sensor facts that drive decisions (pixel pitch, readout, IBIS, shutter types, FTZ II behaviour, special features).
4. Settings Explainer: what each important setting does, per-body menu path, when to change it, suggested values for the owner's scenarios.
5. Works fully offline after first load; one-handed on iPhone; readable in sun (light theme) and at night (red night mode).
6. Content is data, not code: researched JSON files that can be re-researched and replaced without touching the app.

Non-goals for v1 (backlog in §11): general DOF/hyperfocal/NPF calculators, scenario presets, packing advisor, the D750 and legacy F gear, considered-but-not-owned gear, live camera connection, accounts or sync.

---

## 2. Users and the moments that matter

One user, technically deep (sensor architecture, optics, video). Typical moments:
- On a trail, swapping to the 70-200 + TC-1.4x for a moonrise: "What is f/4 at 280mm like, and how far can I stop down on the Z8 before diffraction?"
- Kneeling at a flower with the MC 105 at 1:1: "If I set f/8, what is the effective aperture, how deep is the focus zone, and should I use focus shift instead?"
- At a dance performance with the Sigma 135 Art on the FTZ II: "Is it sharp wide open, and which AF-area mode and flicker setting should I use under LED lights?"
- Picking up the Z50 II for travel: "On DX, where does diffraction kick in versus the Z8?"

Design rule from this: the first screen after choosing lens + body must answer the aperture question without scrolling.

---

## 3. Platform and architecture

- Progressive Web App, installable to the iPhone home screen, fully offline via service worker.
- Stack: Vite + TypeScript + Preact (small runtime) + vite-plugin-pwa (Workbox precache of all assets and data). No backend. No external network calls at runtime.
- Content: all JSON under `data/` is imported at build time (`import.meta.glob('../data/**/*.json', { eager: true })`) and bundled, so the app works offline even if the service worker cache is evicted while the app shell is still in memory. Total data is expected to be well under 1 MB.
- State: `localStorage` for the current body, current lens, recent lenses, last focal length per zoom, TC on/off, theme. Wrap every read/write in try/catch; app must work if storage is unavailable.
- Hosting: any static HTTPS host (GitHub Pages, Cloudflare Pages or Netlify). Content is not sensitive. HTTPS is required for the service worker.
- Testing: Vitest for the optics library (§6) and data validation; Playwright smoke test at iPhone 15 viewport (393×852).
- Accessibility: Dynamic Type friendly (rem units), minimum 44pt tap targets, color is never the only signal (bands also carry text labels).

Directory layout Claude Code should create:

```
gearcard/
  CLAUDE.md  SPEC.md
  data/      (provided — do not hand-edit numbers without a source)
    SCHEMA.md
    kit.json
    bodies/*.json  lenses/*.json  accessories/*.json  settings/*.json
  design/    (provided mockups)
  docs/      (provided research notes, reference tables)
  app/
    index.html
    src/
      main.tsx
      lib/optics.ts         derived math (§6), pure functions
      lib/data.ts           loading, indexing, validation at startup
      lib/state.ts
      components/…          ApertureStrip, CloseUpBlock, SourceSheet, BodyPicker, LensPicker, SettingRow…
      screens/…             Mounted, LensCard, BodyCard, Settings, SettingDetail, Search, About
      styles/
    tests/
  scripts/validate-data.ts  JSON Schema (ajv) validation, run in CI and pre-build
```

---

## 4. Information architecture

Bottom tab bar (four tabs):
1. **Mounted** (home): body selector + lens selector + the Lens Card for that pair.
2. **Lenses**: list of owned lenses grouped (Z FX zooms, Z FX primes, Z DX, manual/character, F on FTZ II). Tapping opens that lens's card on the current body.
3. **Settings**: Settings Explainer, filtered to the current body by default.
4. **More**: Body Cards, Search, Data & Sources (what was researched, when, confidence summary), theme toggle.

Global: a search field at the top of Lenses and Settings; long-press on a lens name anywhere to "Mount this".

---

## 5. Screens

### 5.1 Mounted (home)
- Top: body segmented control `Z8 | Z5 II | Z50 II` (shows "DX crop" chip automatically when a DX lens is on an FX body).
- Lens row: current lens name, tap to open a bottom sheet picker (recent five at top, then grouped list, search).
- Below: the Lens Card content for this pair (§5.2). No extra tap needed.

### 5.2 Lens Card (the core screen)
Order matters; the first two blocks must fit on one iPhone screen.

**A. Header.** Lens short name, body, and when relevant: equivalent focal length (DX lens or DX crop), "MF only on FTZ II" warning chip, "No CPU — enter focal length in Non-CPU lens data" chip, VR / Synchro VR chip, TC toggle (only if `tc_compatible`).

**B. Sharpness by aperture (hero; v1.5).** Three hero tiles (Sharpest = Overall peak, Drops from = first measurable loss, Closest), then the Sharpness card:
- *Overall* first, large and open: peak range, "derived" tag when computed from the centre and corner peaks, an SVG curve (average of centre and corners, peak band shaded) and an aperture strip from the widest aperture to f/22 in full stops: amber rising, green peak, light green still fine, grey downhill (from `downhillFrom`), dark grey clearly softer (from `clearlySofter`). One plain-language recommendation line under it.
- *Center / Corners* behind an expander: the two-curve chart (centre solid, corners dashed) and a strip each. No numbers on the y-axis; caption "Shape, not measured values."
- Zooms: wide / mid / long selector (kept in step with the focal-length stepper). TC on: the with-converter entry, in displayed f-numbers. Close-up lenses: magnification selector; lenses that show the set aperture shift the strip by the close-focus loss.
- `inferred` entries carry an "inferred" tag and dashed borders on the segments that depend on inferred values; thin data uses the §6.1 fallback; no peak data shows "not measured".
- Card footer: "Sources: … · updated YYYY-MM-DD". Confidence/evidence row opens the Sources sheet. Focal-length stepper, caption line (`quick.headline`) and the `wide_open` text stay.

**C. Close-up block.**
- Minimum focus distance (from focal plane) and maximum magnification as ratio and decimal (e.g. `1:2.6 · 0.39×`), per focal length for zooms (show the focal length where max magnification occurs).
- Frame width at max magnification on this body: `sensor_width / m` (e.g. "smallest subject that fills the frame: 92 × 61 mm on Z8").
- Working distance at max magnification when known.
- Effective aperture at max magnification for the current set aperture (§6.3), with note when the camera already displays it (Nikon Z macro lenses) versus when it does not (Laowa, Tokina via FTZ, all manual lenses).
- Best close-up aperture: `quick.close_up_best` + `close_up_note`.
- A mini table: DOF at max magnification for three apertures (e.g. f/5.6, f/8, f/11) using the body's pixel-level CoC and the output CoC (§6.4), with a hint "for more depth, use Focus shift shooting" if the body supports it.

**D. Avoid.** `quick.avoid` lines, red-outlined.

**E. Character.** Compact rows: bokeh, flare/sunstar, CA, distortion, vignetting, coma (only for wides), focus breathing (only for lenses used in video). Empty fields hidden.

**F. Field tips.** `field_tips` plus any `body_notes` matching the current body.

**G. Sources sheet** (bottom sheet): list of sources with kind icon (measured / review / video / manufacturer / forum), tested-on body, date, findings, link (opens in Safari when online). Chris Frost row always shown, with the access level stated honestly (e.g. "Title and description only — verdict not verified"). `research_notes` at the bottom.

### 5.3 Body Card
Sensor (MP, pixel pitch, sensor size, stacked/BSI, OLPF), readout speeds, ISO base and dual-gain point, IBIS stops / Synchro VR / Focus-Point VR, shutter types and flash sync, drive and pre-release capture, AF subject detection, DX crop MP, FTZ II behaviour, special features (with firmware), current firmware, field tips. Plus a computed diffraction table for this body (§6.1) and a "same lens, other bodies" comparison line.

### 5.4 Settings Explainer
- Grouped list: Autofocus · Drive, shutter & VR · Exposure & image · Video & controls.
- Default filter: current body only (settings not available on it are hidden, with a toggle to "Show all bodies").
- Scenario chips across the top: Birds · Stage dance · Kids · Landscape (tripod) · Macro · Moonrise/astro · Video. Selecting a chip filters to settings that have a `suggested` entry for that scenario and shows the suggested value inline. Chips map to `suggested[].scenario_id` (dance, birds, kids, landscape, macro, moonrise, video). Nearly every setting has a stage-dance entry, so within a chip, order settings by group and show the suggested value as the row subtitle (see `design/` Settings artboard).
- Row: name + one-liner. Detail screen: what it does, options (value · meaning · use when), suggested values by scenario, menu path for the current body (prominent) and other bodies (collapsed), body differences, gotchas, related settings (tappable), sources.

### 5.5 Search
Single search over lens names, setting names, options, one-liners and gotchas. Results grouped by type.

### 5.6 Data & Sources
Research date, number of sources by kind, list of low-confidence items, known conflicts (from `research_notes`), app and data version.

### 5.7 Themes
- Light (default): warm off-white background (#fbfaf7), dark ink, high-contrast bands — readable in sun.
- Night (red): black background, all UI in dim red (#ff3b30 at reduced luminance), bands drawn as red intensities with text labels; brightness kept low to protect dark adaptation for moonrise and astro sessions. Toggle in More and via long-press on the header.

---

## 6. Derived optics (lib/optics.ts)

All functions pure, unit-tested, using λ = 0.55 µm (green). Inputs come from body and lens JSON.

### 6.1 Sharpness curves and the diffraction fallback (v1.5)
Each lens has a rising side (lens-specific: aberrations clear as you stop down), a falling side (same for every lens: diffraction blur grows with f-number) and a peak where they cross. The peak differs per lens, centre versus corners and per focal length, and it is what reviewers mean by "diffraction kicks in at f/X". The app stores review verdicts and aperture ranges in `data/lens-curves.json` (fields and rules in `data/README.md`) and draws the shape; it never invents a numeric sharpness.

Derived: Overall = `overallPeak`, else the overlap of centre and corner peaks; no overlap → the later peak start if it is before `downhillFrom`, else the last stop before it. Close-focus lenses that show the set aperture shift the strip by the loss factor (lens-specific if researched, else 1 + m, in thirds of a stop); a lens whose camera shows the effective aperture needs no shift.

Fallback for fields marked inferred: downhill from f/11 on FX, f/7.1 for DX-coverage lenses and on the Z50 II, clearly softer one stop later. Airy disk `d = 2.44 · λ · N ≈ 1.342 · N` µm reaching `sensor_diagonal / 3000` is where any lens is past its peak, not where a particular lens peaks.

The old per-body bands (measurable / visible at 100% / soft in large output) and `quick.diffraction_note` under the strip are no longer shown. The lens JSON still holds that research.

### 6.2 Teleconverter
For `tc_compatible` lenses with TC-1.4x on: focal × 1.4; every aperture × 1.4 (one stop) — the camera displays this effective value, so the strip is labelled in displayed f-numbers; minimum focus distance unchanged, so max magnification × 1.4; the curve is in displayed f-numbers. v1.5 uses the with-converter entry in `lens-curves.json` (`tc: true`, e.g. 280 mm for the 70-200, 840 mm for the 180-600). TC-compatible lenses in the kit: 70-200 f/2.8 VR S and 180-600 VR only (the MC 105 is not compatible — data confirms).

### 6.3 Effective aperture at close focus
`N_eff = N · (1 + m / P)` with pupil magnification P. Default P = 1 (state "approx." in UI); allow a per-lens `pupil_magnification` override in data if a source provides it.

Two cases, decided per lens by `close_focus.camera_displays_effective` (true for the Z MC 105; false for lenses without electronic contacts; null = unverified, which the app treats as nominal and labels "camera may or may not show this — unverified"). The Z TC-1.4x factor is always displayed by the camera and is handled separately in §6.2:
- **Camera displays effective aperture** (Z MC 105 S): the number on the camera already is N_eff. Do not multiply again. The app shows "Camera shows the effective aperture. At 1:1 wide open it reads f/4.5." and computes DOF from the displayed number directly.
- **Camera displays nominal aperture** (Laowa 65 with no CPU, Tokina 100 and AF Micro 60 via FTZ II unless data says otherwise): show "You set f/X; at this magnification you are really at ≈ f/Y" and compute everything from N_eff.

Worked examples (unit tests):
- Laowa 65 at 2:1, set f/4 → N_eff = 4 × 3 = f/12 → past the Z8 "visible at 100%" boundary (f/8).
- AF Micro 60 at 1:1, set f/8 → N_eff ≈ f/16 (P = 1) → well past it; data notes Nikon's exposure factor implies ≈ f/14.
- MC 105 at 1:1, camera shows f/8 → that is already effective; f/8 is right at the Z8 boundary, matching Savazzi's measured peak at effective f/5.6 and loss starting by f/8.

### 6.4 Close-up depth of field
Total DOF at magnification m (valid for close-up, m ≥ ~0.1): `DOF ≈ 2 · N · c · (1 + m/P) / m²` (mm).
- `c_pixel = 2 · p` (critical, 100% view) and `c_out = diagonal / 3000` (output). Show both as "at 100%" and "in print".
- Example (nominal display, e.g. Tokina 100): Z8, m = 1, set N = 8: `c_pixel` = 8.7 µm → DOF ≈ 2 · 8 · 0.0087 · 2 / 1 ≈ 0.28 mm.
- Example (effective display, MC 105): Z8, m = 1, camera shows f/8 → DOF ≈ 2 · 8 · 0.0087 / 1 ≈ 0.14 mm (the (1 + m) factor is already inside the displayed number).

### 6.5 Frame size at magnification
`frame_w = sensor_width_mm / m`, `frame_h = sensor_height_mm / m`. Use the DX crop dimensions (23.5 × 15.7 mm) for a DX lens on an FX body.

### 6.6 Equivalent focal length
`crop = 43.27 / sensor_diagonal_mm`; show equivalent focal length when crop > 1.05.

### 6.7 Third-stop scale
`[1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32]`. Display rounding snaps to this list; computation keeps full precision.

Unit tests must include the example numbers above.

---

## 7. Data model

Authoritative definitions: `data/SCHEMA.md`. Summary:
- `kit.json`: the owned gear in scope, with display order and grouping. Source of ownership is the owner's gear spreadsheet / project manifest (Nov 5, 2026). The app shows only items in `kit.json`.
- `bodies/<id>.json`: sensor, ISO, IBIS, shutter, AF, FTZ II behaviour, special features, firmware, tips, sources.
- `lenses/<id>.json`: identity, apertures, focus and VR, close-focus specs, `quick` verdicts (headline, sweet spot, by_focal, close_up_best, diffraction_note, avoid, confidence), character, field tips, body notes, TC compatibility, sources, Chris Frost access, research notes.
- `accessories/*.json`: FTZ II and Z TC-1.4x.
- `settings/<group>.json`: arrays of setting records.

Validation (`scripts/validate-data.ts`, runs before every build):
- JSON Schema derived from SCHEMA.md; every lens in `kit.json` has a file and vice versa.
- Every `quick` block has at least one source; confidence `high` requires ≥ 2 sources with `kind: measured`.
- Every URL is https and non-empty or null.
- Warn (not fail) on missing optional fields.

Authority rules when files disagree: firmware versions and body capabilities come from `bodies/*.json` (researched later and more completely; e.g. Z8 firmware 3.12) over mentions inside settings entries; lens-specific measured findings beat the computed diffraction bands; `research_notes` must be surfaced, not hidden.

Content update workflow: re-research a lens → replace its JSON → run validation → rebuild. Each file carries its sources and research date, so stale data is visible in Data & Sources.

---

## 8. Visual design

See `design/` for mockups. Principles:
- Light background, dark ink, one accent (amber #9a5b00) consistent with the owner's other guides; band colours green / amber / orange / red with text labels always.
- Big type for the three numbers that matter on the hero (sweet spot, diffraction "visible at 100%", max magnification).
- Dense but calm: prose one-liners, no paragraphs on the first screen.
- Monospace-ish tabular numerals for apertures and distances.

---

## 9. Build phases and acceptance criteria

**Phase 1 — Core lens card (MVP).**
- Body + lens selection persists across launches.
- Sharpness strips and curves are correct for every lens (acceptance tests in `app/tests/curves.test.ts`: 14-30 S, 70-200 + TC, MC 105, Tokina, Laowa, thin-data fallback).
- Close-up block shows MFD, max magnification, frame size, effective aperture and DOF; unit tests pass for §6 examples.
- Installable PWA; airplane-mode test: kill app, enable airplane mode, relaunch from home screen → everything works.

**Phase 2 — Settings Explainer + Search.**
- Body filter, scenario chips, detail screen with per-body menu paths.
- Search returns lens and setting results within 50 ms on device.

**Phase 3 — TC toggle, Body Cards, Night theme, Data & Sources.**
- TC toggle appears only for compatible lenses and recomputes everything.
- Night theme passes a manual check in a dark room (no white flashes, including on launch).

Definition of done for v1: all three phases, Lighthouse PWA installable, no console errors, data validation green.

---

## 10. Content scope (v1)

Bodies: Nikon Z8, Z5 II, Z50 II. Accessories: FTZ II, Z TC-1.4x.

Lenses (25):
- Z FX zooms: 14-30 f/4 S, 24-120 f/4 S, 70-200 f/2.8 VR S, 180-600 f/5.6-6.3 VR.
- Z FX primes: 26 f/2.8, 28 f/2.8 SE, 40 f/2, 50 f/1.8 S, MC 105 f/2.8 VR S.
- Z DX: 12-28 PZ VR, 16-50 VR, 18-140 VR, 50-250 VR, Sigma 30 f/1.4 DC DN, Sigma 56 f/1.4 DC DN.
- Manual / character: Thypoch Simera 28 f/1.4 (Z), Laowa 65 f/2.8 2× Ultra Macro (Z), Zeiss Milvus 2/35 ZF.2, Voigtländer Nokton 58 f/1.4 SL II, Tokina AT-X M100 PRO D.
- F lenses on FTZ II: AF Micro 60 f/2.8D (MF on Z), AF-S 85 f/1.4G, Sigma 135 f/1.8 Art, AF DC-Nikkor 105 f/2D, AF 50 f/1.8D.

Assumptions to confirm: the Z 105 is the MC 105mm f/2.8 VR S; the Z 40mm is the standard (non-SE) version.

Out of scope for v1 but owned: Nikon D750, AF-S 28-300 VR, 17-35 f/2.8D, AF 70-300, N80, lighting, supports.

---

## 11. Backlog (v2+)

1. Field calculators: DOF/hyperfocal for any lens, NPF/500 rule for stars on each body, shutter speed for motion (with the owner's Bharatanatyam shutter guide), flash range with the Godox V1.
2. Scenario presets: "Stage dance", "Birds", "Moonrise", "Macro" → recommended lens, aperture, shutter, AF and VR settings in one card, linking to Settings Explainer entries.
3. Pack advisor: given a shoot type and weight budget, which lenses to take.
4. D750 and legacy F lenses; considered gear (Z 135 f/1.8 S Plena, PC-Nikkor 28) for compare-before-buy.
5. Integration with the owner's sky-clarity weather app: deep link from a forecast to the right lens card.
6. Personal notes per lens (local only) and "my observed sweet spot" override that sits beside the researched verdict.
