#!/usr/bin/env python3
"""Export the design canvas artboards (design/canvas/project/*.dc.html) to plain HTML in design/screens/.
Run from repo root: python3 scripts/export_screens.py"""
import re, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'design/canvas/project'); out = os.path.join(ROOT, 'design/screens')
os.makedirs(out, exist_ok=True)
canvas = json.load(open(f'{src}/canvas.json'))
items = []
for f in canvas['order']:
    s = open(f'{src}/{f}').read()
    title = re.search(r'<title>(.*?)</title>', s).group(1)
    helmet = re.search(r'<helmet>(.*?)</helmet>', s, re.S).group(1).strip()
    body = re.search(r'<x-dc>.*?</helmet>(.*?)</x-dc>', s, re.S).group(1).strip()
    assert '{{' not in body, f
    body = re.sub(r'href="([A-Za-z]+)\.dc\.html"', r'href="\1.html"', body)
    name = f.replace('.dc.html', '')
    open(f'{out}/{name}.html', 'w').write(
        f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        f'<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>{title}</title>\n{helmet}\n'
        f'<style>html{{background:#E9E7E1}} body{{display:flex;justify-content:center;padding:24px 0}}</style>\n'
        f'</head>\n<body>\n{body}\n</body>\n</html>\n')
    items.append((name, canvas['boards'][f].get('title', name), body))
fonts = re.search(r'<helmet>(.*?)</helmet>', open(f'{src}/Main.dc.html').read(), re.S).group(1).strip()
cards = ''.join(
    f'<figure style="margin:0;display:flex;flex-direction:column;gap:10px">'
    f'<figcaption style="font:600 14px \'IBM Plex Sans\',system-ui,sans-serif;color:#3D4350;max-width:390px">{t} · <a href="{n}.html">open alone</a></figcaption>'
    f'<div style="width:390px;border-radius:28px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12);border:1px solid #D9D6CE">{b}</div></figure>\n'
    for n, t, b in items)
open(f'{out}/index.html', 'w').write(
    f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    f'<title>GearCard — all screens</title>\n{fonts}\n'
    f'<style>body{{background:#E9E7E1;padding:32px}} h1{{font:700 28px \'IBM Plex Sans\',system-ui,sans-serif;color:#1D2129;margin:0 0 6px}} '
    f'p.lead{{font:400 15px \'IBM Plex Sans\',system-ui,sans-serif;color:#3D4350;margin:0 0 28px;max-width:900px}}</style>\n</head>\n<body>\n'
    f'<h1>GearCard — iPhone screens (390 × 844)</h1>\n<p class="lead">Static mockups built from the researched data. Tall frames show a full scroll. '
    f'Behaviour is defined in SPEC.md; this page is the visual reference.</p>\n'
    f'<div style="display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start">\n{cards}</div>\n</body>\n</html>\n')
print('exported', len(items), 'screens + index.html')
