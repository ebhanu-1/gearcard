# GearCard — handoff package

An offline iPhone field reference for Bhanu's Nikon kit: mount a lens on a body and see where it's sharp, where diffraction starts on that body, how close it focuses and what aperture to use up close. Plus a settings explainer for the Z8, Z5 II and Z50 II.

## What's in the box

| Path | What it is |
|---|---|
| `SPEC.md` | Product and build spec — screens, optics formulas, data model, phases, acceptance criteria. Start here. |
| `CLAUDE.md` | Instructions for Claude Code: stack, ground rules, build order. |
| `data/SCHEMA.md` | Content schema. |
| `data/kit.json` | The gear in scope (25 lenses, 3 bodies, FTZ II, TC-1.4x) and grouping. |
| `data/lenses/*.json` | 25 researched lens records with verdicts, close-up data, character, tips and cited sources. |
| `data/bodies/*.json` | Z8, Z5 II, Z50 II records. |
| `data/accessories/*.json` | FTZ II and Z TC-1.4x. |
| `data/settings/*.json` | Settings explainer content, four groups. |
| `docs/reference-tables.md` | Generated diffraction bands per body and close-up numbers per lens × body — the values the app's optics library must reproduce. |
| `docs/research-summary.md` | Coverage, confidence and open questions across all content. |
| `design/screens/` | Screen mockups as plain HTML — open `index.html` to see all eight. Editable source in `design/canvas/` (also live as a Claude Design canvas). |
| `scripts/` | `check_data.py` (content checks), `reference_tables.py`, `research_summary.py`, `export_screens.py`. |

## Handing it to Claude Code

1. Put this folder in a new git repo.
2. Open Claude Code in the repo and say: "Read CLAUDE.md and SPEC.md, then build Phase 1."
3. After each phase, run the app on your iPhone (Safari → Share → Add to Home Screen) and test in airplane mode.

## Keeping the content fresh

Each lens file is self-contained. To refresh one, ask Claude to re-research that lens against `data/SCHEMA.md`, replace the file, then run `python3 scripts/check_data.py` and `python3 scripts/reference_tables.py`.

## Running the app (built)

```
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # optics + lens-card unit tests (34)
npm run build      # validates data, typechecks, builds the PWA into app/dist
npm run preview    # serve the production build (needed to test the service worker)
```

Host `app/dist` on any static HTTPS site (GitHub Pages, Cloudflare Pages, Netlify), open it in Safari on the iPhone, then Share → Add to Home Screen. After the first load it works in airplane mode.

Phase 1–3 of `SPEC.md` are implemented. Known data gaps the app surfaces rather than hides: the Video scenario has no researched suggestions, and `tc_compatible` is unset for the AF Micro 60, Sigma 135 Art and Tokina 100 (treated as no teleconverter).
