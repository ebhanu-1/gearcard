**Version 1.5** · 2026-11-05 · applied and published as GearCard v1.5

# GearCard change brief: per-lens sharpness curve

Paste this into Claude Code in the GearCard project. It replaces the per-body diffraction model from the original handoff. It also replaces the earlier version of this brief: if that version has already been applied, undo its "format ceiling" lens-card line and its "Cropping hard" toggle.

Before changing anything, read the existing code. Find where the per-body diffraction bands ("Measurable", "Visible at 100%", "Large output") are defined and displayed, and where per-lens sharpness and aperture data lives. Keep everything else as it is.

## The model

Every lens has its own sharpness-versus-aperture curve:
- **Rising side (lens-specific):** stopping down reduces aberrations. How far you need to stop down depends on the lens, and corners usually need more than the center.
- **Falling side (same for every lens):** diffraction blur grows with f-number.
- **Peak:** where the two sides cross. It's different for each lens, for center vs corners, and for each focal length on a zoom. Reviewers' "diffraction kicks in at f/X" means this peak.

The app should show this curve on every lens card. Remove the per-body diffraction table and bands from the UI completely.

## 1. Per-lens curve data

For every lens (and, on zooms, for each of up to three focal lengths: wide / mid / long), store:

| Field | Meaning | Example: 14-30 S at 14mm |
|---|---|---|
| `wideOpen` | One-line verdict wide open, center and corners | "Center very good; corners weaker" |
| `centerPeak` | Aperture range where the center is sharpest | f/5.6–f/8 |
| `cornerPeak` | Aperture range where the corners/edges are sharpest | f/5.6–f/8 |
| `downhillFrom` | First aperture with a measurable drop from the peak | f/11 |
| `clearlySofter` | Aperture where the drop is obvious | f/16 |
| `overallPeak` | Optional. Whole-frame best range, if a review states one; otherwise derived (section 2) | f/5.6–f/8 (derived) |
| `source` | Review(s) and test body | PhotographyBlog (Z7); Thom Hogan |
| `confidence` | `measured` (lab or reviewer data) or `inferred` | measured |

Fill these from the per-lens research data the app already has. Don't invent values. If a field isn't supported by the existing data, set `confidence: inferred` and apply the fallback in section 4.

Reference values for the 14-30 S (already researched, so use these):
- 14mm: center f/5.6–f/8, edges f/5.6–f/8, slight drop at f/11, more at f/16, worst at f/22 but still fairly good.
- 30mm: big center gain from f/4 to f/5.6; center excellent from f/5.6.
- Long end: edges best at f/8–f/11.
- Corners never fully match the center.

## 2. Lens card UI: the curve

**Order on the card:** Overall first, shown large and open by default. Center and Corners come below it, smaller, in a two-up view or behind a "Center / Corners" expander.

**Overall** is the whole frame: the aperture range where the center is still at its peak and the corners have caught up.
- If the data has `overallPeak`, use it.
- Otherwise, derive it as the overlap of `centerPeak` and `cornerPeak`.
- If they don't overlap, use the start of `cornerPeak`, as long as it's before `downhillFrom`. If it isn't, use the last aperture before `downhillFrom`.
- Mark a derived value with a small "derived" tag.
- Overall's `downhillFrom` and `clearlySofter` are the earlier of the center and corner values.

Show an **aperture strip** for each row (Overall, Center, Corners), running from the lens's maximum aperture to f/22 in full stops. Color each stop:
- **Rising:** amber.
- **Peak:** green. This is `centerPeak` or `cornerPeak`.
- **Still fine:** light green, from the end of the peak up to `downhillFrom`.
- **Downhill:** grey, from `downhillFrom`.
- **Clearly softer:** dark grey, from `clearlySofter`.

On zooms, add a wide / mid / long selector above the strips.

Under the strips, show one plain-language recommendation, for example: "Landscape with corners: f/8. Center only: f/5.6. Fine for depth of field: f/11. f/16+ only on purpose (depth of field, sunstars)."

If `confidence` is `inferred`, show a small "inferred" tag and dashed segment borders.

**Curve view (default; the strips sit underneath as the exact reference).** The Overall chart comes first. It shows a single thick curve, drawn as the average of the center and corner curves, with its peak band shaded at the Overall range. The detail chart below draws two smooth curves, Center (solid) and Corners (dashed), with aperture on the x-axis from the maximum aperture to f/22.
- Build each curve from the fields alone:
  - Rise from the `wideOpen` level to a flat top across the peak range.
  - Ease off slightly up to `downhillFrom`.
  - Then fall, more steeply after `clearlySofter`.
- Start the corner curve lower than the center curve. Keep it below the center at its peak if the data says corners never match the center.
- Leave the y-axis unlabeled and add a caption: "Shape, not measured values."
- Shade the peak band green behind the curves.
- Light background.

On zooms, the wide / mid / long selector redraws both curves.

The y-axis must not have numbers. The data is review verdicts and aperture ranges, not one consistent MTF scale, and scores from different review sites can't be mixed onto one axis.

Caption shown once on the info screen, not on every card: "Peaks come from reviews, mostly on 45MP bodies like the Z8. On the Z5 II and at normal viewing sizes, the peak is in the same place but the drop past it is gentler."

## 3. Macro lenses and teleconverters: show the aperture you set

The curve is about the effective aperture, so translate it into the aperture the user dials in:

- **Z TC-1.4x:** Z bodies already show the combined aperture. Show the curve for the combination in displayed f-numbers. For the 70-200 + TC: peak f/5.6–f/8, with f/4 noticeably softer (existing research).
- **MC 105 S:** the display already includes the close-focus loss (f/4.5 wide open at 1:1). Use displayed values: peak f/5.6–f/8 on the Z8 (existing research).
- **Lenses that show the nominal aperture** (Tokina 100 macro, AF Micro 60 f/2.8D, Laowa 65 2x): at macro distances, add a magnification selector (∞, 1:2, 1:1, and 2:1 for the Laowa only). Shift the strip by the loss factor so it shows set apertures:
  - Use the lens-specific loss if it's in the data: Tokina ≈ 2 stops at 1:1, AF Micro 60 ≈ 1⅔ stops at 1:1.
  - Otherwise use (1 + m): 1:2 ≈ 1⅓ stops, 1:1 = 2 stops, 2:1 ≈ 3⅓ stops.
  - Example: if the Tokina's effective downhill starts at f/11, at 1:1 the strip shows downhill from f/5.6 set.
  - Laowa at 2:1: f/2.8 set ≈ f/8.4 effective, so the whole strip is downhill. Show "Diffraction-limited at any aperture at 2:1: stay at f/2.8–f/4 and focus-stack."

## 4. Fallback when data is thin

Only for fields marked `inferred`:
- `downhillFrom`: f/11 on FX, f/7.1 for DX-coverage lenses (Z DX, Sigma DN, Laowa 65) and on the Z50 II.
- `clearlySofter`: one stop past `downhillFrom`.
- `centerPeak` / `cornerPeak`: if unknown, show "not measured" rather than guessing.

These fallback values come from the Airy disk (1.342 × N µm) reaching sensor diagonal / 3000. They are where any lens is past its peak, not where a particular lens peaks.

## 5. Keep the lens data updatable

The curves will be refined as new reviews come in, so the data has to be easy to edit without touching code.
- Move all per-lens curve data into one standalone file, for example `data/lens-curves.json`. Store one entry per lens and focal length, using the fields in section 1, plus `lastUpdated` (date) and `sources` (an array of {name, url, testBody}).
- Load it at startup and cache it for offline use (in the existing service worker or cache, if the app has one).
- Validate the file on load. If an entry is malformed, show that lens as "data error" instead of breaking the app.
- Add a short `data/README.md` explaining the schema, with the 14-30 S entry as a worked example.
- On each lens card, add a small footer: "Sources: … · updated YYYY-MM-DD".

Update workflow (for the user, no code changes): ask Claude to research a lens and return an entry in this schema, paste it into `lens-curves.json`, and redeploy.

## 6. Remove

- The per-body diffraction table and bands ("Measurable", "Visible at 100%", "Large output") from the UI and logic.
- Any per-body diffraction warnings tied to pixel pitch. Keep pixel pitch in the body data only if something else uses it.

## 7. Acceptance tests

| Card / input | Expected |
|---|---|
| 14-30 S, wide, Overall (first on card) | green f/5.6–f/8, "derived" tag |
| 14-30 S, long, Overall | green at f/8 (center excellent from f/5.6, corners f/8–f/11) |
| Center/Corners detail | below Overall, smaller or behind the expander |
| 14-30 S, wide, Center row | amber f/4, green f/5.6–f/8, grey from f/11, dark grey from f/16 |
| 14-30 S, long, Corners row | green f/8–f/11 |
| 14-30 S recommendation line | mentions f/8 for corners and f/5.6 for center only |
| 70-200 + TC-1.4x | strip starts at f/4 (displayed), green f/5.6–f/8 |
| MC 105 S | strip starts at f/4.5 at 1:1, green f/5.6–f/8 |
| Tokina 100, magnification 1:1 | strip shifted 2 stops: downhill starts 2 stops earlier than at ∞ |
| Laowa 65, magnification 2:1 | whole strip downhill, with the focus-stack message |
| Any lens with no peak data | "not measured" peak, "inferred" tag, downhill from f/11 (FX) or f/7.1 (DX) |
| Any body screen | no per-body diffraction table |
| 14-30 S curve view, wide | center curve flat-topped over f/5.6–f/8, corner curve below it, both falling after f/11; no numbers on the y-axis |
| Edit one value in `lens-curves.json` and reload | the card reflects the change with no code change; footer date updates |
| Break one entry's JSON | that lens shows "data error"; other lenses still load |

Run the data-mapping and shift logic as unit tests. Then open the 14-30, 70-200 + TC, MC 105, Tokina and Laowa cards and check them in the UI.
