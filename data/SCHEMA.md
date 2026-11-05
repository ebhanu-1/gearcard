# GearCard content schema (v1)

All content lives in JSON, one file per record. UTF-8, 2-space indent. Every number or verdict a photographer would act on must be traceable to an entry in `sources`. Unknown = `null` plus a note in `research_notes`. Never invent a value.

Conventions
- Apertures are strings like `"f/5.6"`; ranges `"f/5.6–f/8"` (en dash).
- Distances in metres from the focal plane (Nikon spec convention) unless the field name says otherwise; working distance in mm from the front of the lens.
- Magnification as a decimal ratio (`0.39` = 1:2.6; `1.0` = 1:1; `2.0` = 2:1).
- Body ids: `z8`, `z5ii`, `z50ii`. Lens ids: kebab-case, e.g. `z-24-120-f4-s`.
- `confidence`: `high` = two or more measured sources agree; `medium` = one measured source, or measured sources disagree modestly; `low` = only subjective reviews, forums, or inference.
- `sources[].kind`: `measured` (lab MTF/resolution charts: Lenstip, OpticalLimits, Photography Life lab, Lensrentals/Olaf, The-Digital-Picture ISO 12233, DXOMARK), `review` (written hands-on), `video` (YouTube etc.), `manufacturer` (Nikon/Sigma/Zeiss/etc. spec pages and manuals), `forum` (DPReview forum, FM, Reddit — lowest weight).
- `sources[].tested_on`: the body/resolution the test used, because the sharpest aperture shifts with pixel pitch (a 24MP test peaks later than a 45MP test).

---

## Lens record — `data/lenses/<id>.json`

```json
{
  "id": "z-24-120-f4-s",
  "name": "NIKKOR Z 24-120mm f/4 S",
  "short": "24-120 f/4 S",
  "mount": "Z",                         // "Z" | "F"
  "adapter": null,                      // null | "FTZ II"
  "coverage": "FX",                     // "FX" | "DX"
  "kind": "zoom",                       // "zoom" | "prime" | "macro"
  "focal_mm": [24, 120],                // [f] for primes
  "max_aperture": [{"focal_mm": 24, "f": 4.0}],
  "min_aperture_f": 22,
  "aperture_blades": 9,
  "rounded_blades": true,
  "weight_g": 630,
  "filter_mm": 77,
  "focus": {
    "on_z_body": "AF",                  // "AF" | "MF only (screw-drive lens on FTZ II)" | "MF (manual-focus lens)"
    "cpu": true,                        // EXIF + focal length passed to IBIS
    "motor": "STM",                     // free text
    "focus_throw_deg": null,            // manual lenses
    "notes": ""
  },
  "stabilization": {
    "lens_vr": false,
    "lens_vr_stops": null,
    "synchro_vr": false,                // Z8 Synchro VR / Z5 II Synchro VR support
    "ibis_on_ftz": null,                // e.g. "3-axis via FTZ II" for F lenses without VR
    "notes": ""
  },
  "close_focus": {
    "mfd_m": [{"focal_mm": 24, "value": 0.35}],
    "max_mag": [{"focal_mm": 120, "value": 0.39}],
    "working_distance_mm_at_max_mag": null,
    "effective_aperture_at_max_mag": null,   // e.g. "f/5.6 displayed at 1:1" for macros
    "camera_displays_effective": null,       // true = the Z body shows the effective f-number at close focus (Z MC 105); false = it shows the nominal value; null = unverified (app treats as false and says so)
    "notes": ""
  },
  "quick": {
    "headline": "One sentence a photographer reads in 3 seconds.",
    "sweet_spot": "f/5.6–f/8",
    "wide_open": "Short verdict on wide-open center and corners.",
    "by_focal": [
      {"focal_mm": 24, "center_peak": "f/5.6", "corners_peak": "f/8", "wide_open_note": ""}
    ],
    "close_up_best": "f/8–f/11",
    "close_up_note": "Why: e.g. field curvature / softer at MFD / focus shift.",
    "diffraction_note": "Lens-specific measured softening, e.g. 'Lenstip (45MP): below wide-open resolution by f/11'.",
    "avoid": ["Short do-not lines"],
    "confidence": "high",
    "confidence_reason": "Lenstip + OpticalLimits agree within one third stop."
  },
  "character": {
    "bokeh": "", "flare_sunstar": "", "ca": "", "distortion": "",
    "vignetting": "", "coma_astro": "", "focus_breathing": "", "other": ""
  },
  "field_tips": ["Max 5 crisp, actionable tips."],
  "body_notes": [{"body": "z8", "note": ""}],
  "tc_compatible": false,
  "sources": [
    {
      "id": "lenstip",
      "name": "Lenstip review",
      "url": "https://...",
      "kind": "measured",
      "tested_on": "Nikon Z7 II (45.7MP)",
      "date": "2023-04",
      "findings": "What this source actually says, paraphrased, with the numbers you used."
    }
  ],
  "chris_frost": {
    "url": null,
    "access": "transcript | description | title-only | not-found",
    "summary": "Only what could actually be read. Never guess his verdict."
  },
  "research_notes": "Conflicts between sources, gaps, assumptions."
}
```

---

## Body record — `data/bodies/<id>.json`

```json
{
  "id": "z8",
  "name": "Nikon Z8",
  "format": "FX",
  "sensor": {
    "effective_mp": 45.7, "width_px": 8256, "height_px": 5504,
    "width_mm": 35.9, "height_mm": 23.9,
    "pixel_pitch_um": 4.35, "type": "stacked BSI CMOS", "olpf": false,
    "readout_ms": 3.7, "readout_notes": "e-shutter stills, 14-bit vs 12-bit, video"
  },
  "iso": {"base": 64, "native_range": "64–25600", "extended": "32–102400", "dual_gain_notes": "", "ptp_notes": ""},
  "ibis": {"cipa_stops": 5.5, "synchro_vr_stops": 6.0, "focus_point_vr": false, "notes": ""},
  "shutter": {"mechanical": false, "efcs": false, "electronic_fastest": "1/32000", "flash_sync": "", "slowest": "900 s (extended)", "notes": ""},
  "drive": {"max_fps_raw": "", "pre_release_capture": "", "notes": ""},
  "af": {"subject_detection": [], "low_light_ev": "", "notes": ""},
  "ftz_ii_behavior": "AF-S/AF-P/HSM/SWM lenses: full AF; screw-drive AF/AF-D: MF only with focus confirmation; IBIS axes for non-VR F lenses...",
  "dx_crop": {"mp": 19.4, "notes": ""},
  "special_features": [{"name": "Pixel shift", "available": true, "firmware": "", "notes": ""}],
  "video_key": {"internal_raw": "", "log": "", "notes": ""},
  "firmware": {"current": "", "date": "", "notable_changes": ""},
  "battery_media": "",
  "field_tips": [],
  "sources": [ /* same shape as lenses */ ],
  "research_notes": ""
}
```

## Accessory record — `data/accessories/<id>.json`

Same spirit; free-form but with `id`, `name`, `kind` ("teleconverter" | "adapter"), `effects` (aperture loss, magnification factor, AF impact), `compatible_lenses` (list, with which of the owner's lenses qualify), `field_tips`, `sources`, `research_notes`.

---

## Setting record — `data/settings/<group>.json`

A file is an array of settings for one group (e.g. `autofocus.json`).

```json
[
  {
    "id": "af-area-mode",
    "group": "Autofocus",
    "name": "AF-area mode",
    "available_on": ["z8", "z5ii", "z50ii"],
    "menu_path": {"z8": "Photo shooting menu > AF-area mode (also i menu)", "z5ii": "...", "z50ii": "..."},
    "one_liner": "Decides which part of the frame the camera is allowed to focus on.",
    "what_it_does": "2–4 sentences, plain but technical.",
    "options": [{"value": "Pinpoint AF", "meaning": "", "use_when": ""}],
    "when_to_change": "",
    "suggested": [{"scenario": "Birds in flight", "scenario_id": "birds", "value": "3D-tracking + Animal detection"}],   // scenario_id ∈ dance | birds | kids | landscape | macro | moonrise | video (normalised by scripts/check_data.py --fix)
    "body_differences": "",
    "gotchas": [""],
    "related": ["af-mode", "subject-detection"],
    "firmware_note": "",
    "research_notes": "What could not be verified (e.g. Z8/Z5 II manual page text not readable; wording taken from the Z50 II manual).",
    "sources": [{"id": "", "name": "", "url": "", "kind": "manufacturer", "findings": ""}]
  }
]
```
