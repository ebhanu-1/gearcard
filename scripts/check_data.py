#!/usr/bin/env python3
"""Content checks for data/ (Python reference; Claude Code ports this to scripts/validate-data.ts).

Usage: python3 scripts/check_data.py            -> report
       python3 scripts/check_data.py --fix      -> also apply safe normalisations (scenario ids)
Exit code 1 on errors.
"""
import json, glob, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = "--fix" in sys.argv
errors, warns = [], []

SCENARIOS = [  # (id, label, keywords)
    ("dance", "Stage dance", ["dance", "stage"]),
    ("birds", "Birds", ["bird"]),
    ("kids", "Kids & family", ["kid", "family", "indoor"]),
    ("landscape", "Landscape", ["landscape", "tripod"]),
    ("macro", "Macro", ["macro"]),
    ("moonrise", "Moonrise & astro", ["moon", "astro", "night sky"]),
    ("video", "Video", ["video"]),
]


def scenario_id(label):
    l = label.lower()
    for sid, _, kws in SCENARIOS:
        if sid == "landscape" and "moon" in l:
            continue
        if any(k in l for k in kws):
            return sid
    return None


def load(path):
    try:
        return json.load(open(path))
    except Exception as e:
        errors.append(f"{path}: invalid JSON ({e})")
        return None


kit = load(os.path.join(ROOT, "data/kit.json"))
kit_lenses = [l for g in kit["lens_groups"] for l in g["lenses"]]
lens_files = {os.path.basename(p)[:-5]: p for p in glob.glob(os.path.join(ROOT, "data/lenses/*.json"))}
body_files = {os.path.basename(p)[:-5]: p for p in glob.glob(os.path.join(ROOT, "data/bodies/*.json"))}

for lid in kit_lenses:
    if lid not in lens_files:
        errors.append(f"kit lens without file: {lid}")
for lid in lens_files:
    if lid not in kit_lenses:
        warns.append(f"lens file not in kit.json: {lid}")
for b in kit["bodies"]:
    if b["id"] not in body_files:
        errors.append(f"kit body without file: {b['id']}")


def check_sources(where, sources):
    for s in sources or []:
        u = s.get("url")
        if u is not None and not str(u).startswith("https://") and not str(u).startswith("http://"):
            errors.append(f"{where}: source {s.get('id')} url not http(s): {u!r}")
        if u and str(u).startswith("http://"):
            warns.append(f"{where}: source {s.get('id')} uses http")
        if not s.get("findings"):
            warns.append(f"{where}: source {s.get('id')} has no findings")


for lid, p in sorted(lens_files.items()):
    d = load(p)
    if d is None:
        continue
    if d.get("id") != lid:
        errors.append(f"{p}: id {d.get('id')} != filename")
    for k in ["name", "short", "mount", "coverage", "focal_mm", "max_aperture", "close_focus", "quick", "sources"]:
        if k not in d:
            errors.append(f"{lid}: missing {k}")
    q = d.get("quick", {})
    for k in ["headline", "sweet_spot", "close_up_best", "confidence"]:
        if not q.get(k):
            errors.append(f"{lid}: quick.{k} empty")
    srcs = d.get("sources", [])
    measured = [s for s in srcs if s.get("kind") == "measured"]
    if q.get("confidence") == "high" and len(measured) < 2:
        warns.append(f"{lid}: confidence high with {len(measured)} measured source(s)")
    if not srcs:
        errors.append(f"{lid}: no sources")
    check_sources(lid, srcs)
    cf = d.get("close_focus", {})
    if "camera_displays_effective" not in cf:
        warns.append(f"{lid}: close_focus.camera_displays_effective missing")
    if d.get("mount") == "F" and d.get("adapter") != "FTZ II":
        errors.append(f"{lid}: F lens without adapter FTZ II")
    if not d.get("chris_frost"):
        warns.append(f"{lid}: chris_frost block missing")

for bid, p in sorted(body_files.items()):
    d = load(p)
    if d is None:
        continue
    s = d.get("sensor", {})
    try:
        pitch = s["width_mm"] / s["width_px"] * 1000
        if abs(pitch - s["pixel_pitch_um"]) > 0.02:
            errors.append(f"{bid}: pixel pitch {s['pixel_pitch_um']} != computed {pitch:.2f}")
    except Exception as e:
        errors.append(f"{bid}: sensor fields incomplete ({e})")
    check_sources(bid, d.get("sources"))

all_ids = set()
for p in sorted(glob.glob(os.path.join(ROOT, "data/settings/*.json"))):
    arr = load(p)
    if arr is None:
        continue
    changed = False
    for s in arr:
        if s["id"] in all_ids:
            errors.append(f"duplicate setting id {s['id']}")
        all_ids.add(s["id"])
        if len(s.get("one_liner", "").split()) > 15:
            warns.append(f"{s['id']}: one_liner > 15 words")
        for b in s.get("available_on", []):
            if b not in body_files:
                errors.append(f"{s['id']}: unknown body {b}")
        for sug in s.get("suggested", []):
            sid = scenario_id(sug.get("scenario", ""))
            if sid is None:
                warns.append(f"{s['id']}: scenario not mapped: {sug.get('scenario')}")
            elif sug.get("scenario_id") != sid:
                if FIX:
                    sug["scenario_id"] = sid
                    changed = True
                else:
                    warns.append(f"{s['id']}: scenario_id missing for {sug.get('scenario')}")
        check_sources(s["id"], s.get("sources"))
    if changed:
        json.dump(arr, open(p, "w"), ensure_ascii=False, indent=2)
for p in glob.glob(os.path.join(ROOT, "data/settings/*.json")):
    for s in json.load(open(p)):
        for r in s.get("related", []):
            if r not in all_ids:
                warns.append(f"{s['id']}: related id not found: {r}")

print(f"lenses {len(lens_files)}, bodies {len(body_files)}, settings {len(all_ids)}")
print(f"ERRORS ({len(errors)})"); [print("  ", e) for e in errors]
print(f"WARNINGS ({len(warns)})"); [print("  ", w) for w in warns]
sys.exit(1 if errors else 0)
