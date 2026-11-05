# Design mockups

Live canvas: https://claude.ai/artifact/UQ8JYszg1Nnrtryj1FaRJo ("GearCard — iPhone screens", 390 × 844 iPhone frames).

**Open `screens/index.html` in any browser** to see all eight screens side by side; each screen is also a standalone page in `screens/` (`Main.html`, `Macro.html`, …) and the links between them work. These are plain HTML with inline styles, so Claude Code can read layout, spacing, colours and copy directly, and can open them in a browser to compare against what it builds. (Fonts load from Google Fonts when online; offline they fall back to the system font.)

`canvas/project/*.dc.html` is the editable source on the design canvas. To regenerate `screens/` after changing the canvas files, run `python3 scripts/export_screens.py`.

| Artboard | Shows |
|---|---|
| `Main` | Mounted screen: Z8 + 70-200 f/2.8 VR S + TC-1.4x at 280 mm. Body switcher, lens row, TC chip, focal stepper, three hero numbers, two-track aperture strip (lens sweet spot over body diffraction bands), verdict, confidence row. |
| `LensCardFull` | The rest of the lens card: by-focal table, close-up tiles and DOF, Avoid, Character, Field tips, body note. |
| `Macro` | Close-up block for the MC 105 at 1:1 on the Z8, including the "camera already shows effective aperture" rule and a comparison with the other macro lenses. |
| `Night` | Red night theme of Main. |
| `Picker` | Lens picker bottom sheet with recents, groups, sweet spot per lens, MF and TC badges. |
| `Sources` | Evidence sheet: consensus line, sources with kind and test body, honest Chris Frost status. |
| `Settings` | Settings explainer filtered to Z8 with the Stage dance scenario chip; suggested values inline. |
| `SettingDetail` | High-frequency flicker reduction: scenario call-out, what it does, options, other scenarios, gotchas, body differences, related, sources. |

Design tokens used: ground #FBFAF7, surface #FFFFFF, line #E3E1DA, ink #1D2129, muted #5B6270, accent #9A5B00; sweet spot #1F7A4D; diffraction bands #F2CF7E (measurable) → #DB6A2C (visible at 100%) → #9E2A1F (large output), ordered by lightness so they read without colour. Type: IBM Plex Sans; IBM Plex Mono for apertures and distances.
