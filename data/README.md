# data/ — content files

`kit.json`, `lenses/`, `bodies/`, `accessories/`, `settings/` are the original researched content (see `SCHEMA.md`).
`lens-curves.json` is the per-lens sharpness-versus-aperture data added in v1.5. This file is the one you refresh as new reviews come in.

## lens-curves.json

The app draws, for every lens (and for each of up to three focal lengths on a zoom), how sharpness changes with aperture: it rises as aberrations clear, peaks, then diffraction pulls it down. Everything on the card (Overall range, strips, curve shapes, the recommendation line) is derived from the fields below. Nothing is numeric sharpness: reviews give verdicts and aperture ranges, not one MTF scale.

### Update workflow (no code changes)
1. Ask Claude to research a lens and return an entry in this schema.
2. Paste it into `lens-curves.json` (replace that lens's block, or add an entry).
3. `cd app && npm run check` validates it, then redeploy (`npm run build`, commit, push). The card, strips, curve and footer date all follow the data.

A malformed lens shows "Data error" on its own card in the app and every other lens still loads. The build refuses to ship a malformed file, so `npm run build` stops and names the entry.

### Shape of the file
```
{ "schema": 1, "lastUpdated": "YYYY-MM-DD",
  "lenses": { "<lens id from kit.json>": { "lastUpdated", "macro"?, "sources": [...], "entries": [...] } } }
```

Per lens: `lastUpdated` (date shown in the card footer), `sources` (array of `{name, url|null, testBody|null}`, listed in the lens's Evidence sheet), `entries`, and `macro` only for close-up lenses.

### Entry fields (one per focal length; zooms get wide / mid / long)
| Field | Meaning |
|---|---|
| `focal_mm` | Focal length this entry applies to. With `tc: true` it is the displayed focal length (280 for the 70-200 with TC-1.4x). |
| `wideOpen` | One-line verdict wide open, centre and corners. |
| `centerPeak`, `cornerPeak` | Aperture range where the centre / corners are sharpest: `"f/5.6–f/8"` or `"f/8"`. `null` = not measured (the card says so; it never guesses). |
| `overallPeak` | Optional. Whole-frame best range if a review states one. Otherwise the app derives it (overlap of the two peaks; else where the corners catch up, if before the drop-off; else the last stop before it) and tags it "derived". |
| `downhillFrom` | First aperture with a measurable drop from the peak, e.g. `"f/11"`. |
| `clearlySofter` | Aperture where the drop is obvious. `null` = no obvious drop within the lens's range. |
| `source` | Short review + test body list for the card footer. |
| `confidence` | `measured` (lab or reviewer data) or `inferred`. |
| `inferredFields` | Optional, with `inferred`: which of `centerPeak, cornerPeak, downhillFrom, clearlySofter` are inferred. Left out, all of them are. |
| `note` | Optional caveats shown under the strips. |
| `tc` | `true` for a result measured with the TC-1.4x on (apertures are displayed f-numbers). |
| `mag` | Only for lenses whose camera display already includes the close-focus loss (MC 105 S): `"inf"` or `"1:1"`. |
| `startAt` | Optional widest displayed aperture when it differs from the lens maximum (MC 105 S reads f/4.5 at 1:1). |
| `cornersNeverMatch` | Optional `true` when the research says the corners never reach the centre's level; only changes the drawn curve. |

### Fallback (only for fields marked inferred, or null drop-off)
`downhillFrom` f/11 on FX, f/7.1 for DX-coverage lenses and on the Z50 II; `clearlySofter` one stop later. These are where any lens is past its peak (Airy disk 1.342 × N µm reaching sensor diagonal / 3000), not where a particular lens peaks. A null peak shows "not measured".

### Close-up lenses: `macro`
`{"mode": "nominal" | "displayed", "magnifications": ["inf","1:2","1:1","2:1"], "lossAt1to1Stops": 2}`
- `nominal` (Tokina 100, AF Micro 60, Laowa 65): the camera shows the set aperture, so at close range the strip is shifted by the loss. `lossAt1to1Stops` is the lens-specific loss when researched (Tokina 2, AF Micro 60 1.67); without it the generic 1 + m is used (1:2 ≈ 1⅓, 1:1 = 2, 2:1 ≈ 3⅓ stops). If every set aperture is past the drop-off (Laowa at 2:1) the card says to stay wide and focus-stack.
- `displayed` (MC 105 S): the camera already shows the effective aperture. Give one entry per `mag`; nothing is shifted.

### Worked example: 14-30 S at 14 mm
```json
{
  "lastUpdated": "2026-11-05",
  "sources": [
    {
      "name": "Lenstip",
      "url": "https://lenstip.com/599.4-Lens_review-Nikon_Nikkor_Z_14-30_mm_f_4_S_Image_resolution.html",
      "testBody": "Nikon Z7 (45.7MP), RAW MTF50"
    },
    {
      "name": "Phillip Reeve blog",
      "url": "https://phillipreeve.net/blog/review-nikon-z-nikkor-14-30mm-f-4-s/",
      "testBody": "Nikon Z7 II (45.7MP)"
    }
  ],
  "entries": [
    {
      "focal_mm": 14,
      "wideOpen": "Center very good; corners weaker",
      "centerPeak": "f/5.6–f/8",
      "cornerPeak": "f/5.6–f/8",
      "downhillFrom": "f/11",
      "clearlySofter": "f/16",
      "cornersNeverMatch": true,
      "source": "PhotographyBlog (Z7); Thom Hogan; Lenstip (Z7); Abbott (Z8); Photography Life",
      "confidence": "measured",
      "note": "Slight drop at f/11, more at f/16, worst at f/22 but still fairly good. Corners never fully match the center."
    }
  ]
}
```
Reading it: centre and corners both peak at f/5.6–f/8, so Overall is derived as f/5.6–f/8. The strip is amber below f/5.6, green f/5.6–f/8, light green until f/11, grey from f/11 and dark grey from f/16. The recommendation line reads "Landscape with corners: f/8. Center only: f/5.6. Fine for depth of field: f/11. f/16+ only on purpose (depth of field, sunstars)."

### Where the values came from
Peaks come from each lens's existing `quick.by_focal` research; drop-off apertures come from the reviewers' stated onsets in `quick.diffraction_note`. The 14-30 S 14 mm and 30 mm values follow the owner's v1.5 reference brief (centre f/5.6–f/8 at 14 mm; the older lens record had f/4–f/5.6). The lens JSON files themselves were not changed.
