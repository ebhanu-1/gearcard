# GearCard — Product & Build Spec (v1)

*Owner: Bhanu Suryadevara · Spec date: 2026-11-05 · Build target: Claude Code · Content: 25 lenses, 3 bodies, 2 accessories, 81 settings*

GearCard is an offline iPhone web app that answers, in the field and in under five seconds, "I just mounted this lens on this body — where is it sharp, where does diffraction start, how close can I get and at what aperture is it best up close?" A second module explains camera settings for the three Z bodies. Every verdict comes from researched sources, shown as one consensus answer with the evidence one tap away.

Everything needed to build it is in this folder: this spec, `CLAUDE.md` (build instructions for Claude Code), `data/` (all researched content as JSON), `design/` (screen mockups), and `docs/` (research notes and the computed reference tables).

---

## 1. Goals and non-goals

Goals for v1
1. Lens Card for any owned lens × owned body combination: sharpness sweet spot (per focal length for zooms), body-specific diffraction bands, close-up block (minimum focus distance, maximum magnification, frame width at max magnification on this body, effective aperture, best close-up aperture, close-up depth of field).
2. Teleconverter toggle for compatible lenses (Z TC-1.4x): recompute focal length, aperture, magnification and diffraction bands.
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

**B. Aperture strip (hero).** A horizontal third-stop scale from the lens's widest aperture at the current focal length to its minimum aperture (`f/1.4 … f/22`), drawn as two aligned tracks (see `design/` Main artboard):
- *Lens track:* sweet spot in green from `quick.by_focal[focal].center_peak`–`corners_peak` (or `quick.sweet_spot` for primes), with a pale tint for "usable but softer" wide-open stops.
- *Body track:* diffraction zones that grow darker with severity — measurable (light amber, pixel-level onset §6.1), visible at 100% (orange), soft in large output (dark red).
- Three hero tiles above the strip: sharpest aperture, "diffraction visible at 100% on <body>", closest focus as magnification + distance.
- A caption line: the `quick.headline`, then `wide_open`.
- For zooms, a focal-length stepper above the strip snaps to the focal lengths present in `by_focal`; intermediate focal lengths show the nearest entry with "≈".
- If `quick.diffraction_note` exists, show it under the strip (measured beats computed).
- Confidence badge (High / Medium / Low) on the right; tap opens the Sources sheet.

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

### 6.1 Diffraction bands per body
Airy disk diameter to first minimum: `d = 2.44 · λ · N` (µm) → `d ≈ 1.342 · N` µm.

| Band | Condition | Meaning |
|---|---|---|
| Measurable | `d ≥ 2 · p` | Pixel-level contrast loss starts; visible only in lab charts or side-by-side 100% crops. |
| Visible at 100% | `d ≥ 2.5 · p` | A careful viewer sees it at 100% zoom. This is the "practical ceiling" for maximum detail. The 2.5 factor is calibrated to the lab reports in `data/lenses` (45MP tests consistently report diffraction from about f/8; 24MP tests from about f/11). |
| Soft in large output | `d ≥ c_out` | Visible in a large print or full-screen 4K view. `c_out = sensor_diagonal / 3000`. |

Where `p` is pixel pitch in µm (`sensor_width_mm / width_px · 1000`). Round the resulting N to the nearest third stop for display, and show the exact value in the Body Card. Thresholds are drawn in ascending order; if two land within a third of a stop of each other, merge them into one labelled boundary (this happens on the Z5 II, where pixel-level and output-level softening coincide near f/11).

Reference values are in `docs/reference-tables.md`, generated from the body JSON by `scripts/reference_tables.py`. In round numbers: Z8 measurable f/6.5, visible at 100% f/8, large output f/11; Z5 II f/9, f/11, f/11; Z50 II f/6.3, f/8, large output (DX) f/7.1.

Lens-measured diffraction (`quick.diffraction_note`) is shown under the strip and wins over the computed bands when they disagree.

UI copy must explain the key insight: pixel pitch decides when you can *see* diffraction at 100%; sensor *format* decides when it shows in the final image. A Z5 II and a Z8 print the same at f/11; the Z8 just shows it earlier at 100%.

When the effective aperture differs from the set aperture (close-up, §6.3), bands are computed on `N_eff`.

### 6.2 Teleconverter
For `tc_compatible` lenses with TC-1.4x on: focal × 1.4; every aperture × 1.4 (one stop) — the camera displays this effective value, so the strip is labelled in displayed f-numbers; minimum focus distance unchanged, so max magnification × 1.4; diffraction bands apply to the displayed N. Sweet spot: if `by_focal` has an entry at the TC focal length (e.g. 280 mm for the 70-200, which was tested), use it; otherwise shift by one stop and label it "≈, extrapolated". TC-compatible lenses in the kit: 70-200 f/2.8 VR S and 180-600 VR only (the MC 105 is not compatible — data confirms).

### 6.3 Effective aperture at close focus
`N_eff = N · (1 + m / P)` with pupil magnification P. Default P = 1 (state "approx." in UI); allow a per-lens `pupil_magnification` override in data if a source provides it.

Two cases, decided per lens by `close_focus.camera_displays_effective` (true for the Z MC 105; false for lenses without electronic contacts; null = unverified, which the app treats as nominal and labels "camera may or may not show this — unverified"). The Z TC-1.4x factor is always displayed by the camera and is handled separately in §6.2:
- **Camera displays effective aperture** (Z MC 105 S): the number on the camera already is N_eff. Do not multiply again. The app shows "Camera shows the effective aperture. At 1:1 wide open it reads f/4.5." and computes bands and DOF from the displayed number directly.
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
- Aperture strip renders correct bands for every lens × body (snapshot tests for Z8 + 24-120 at 24 and 120 mm, Z50 II + Sigma 30, Z8 + DX lens in crop).
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
