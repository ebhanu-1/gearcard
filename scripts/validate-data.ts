// Pre-build content validation (SPEC §7). Errors fail the build; warnings do not.
// Run from app/: npm run validate
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCurveFile } from '../app/src/lib/curves'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(join(root, 'app', 'package.json'))
const Ajv = require('ajv').default ?? require('ajv')

const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const list = (d: string) => readdirSync(join(root, d)).filter((f) => f.endsWith('.json')).sort()

const str = { type: 'string' }
const strN = { type: ['string', 'null'] }
const num = { type: 'number' }
const numN = { type: ['number', 'null'] }
const focalVals = { type: 'array', items: { type: 'object', required: ['focal_mm', 'value'], properties: { focal_mm: num, value: num } } }
const source = {
  type: 'object',
  required: ['name', 'kind'],
  properties: {
    name: str,
    url: strN,
    kind: { enum: ['measured', 'review', 'video', 'manufacturer', 'forum'] },
  },
}

const lensSchema = {
  type: 'object',
  required: ['id', 'name', 'short', 'mount', 'coverage', 'kind', 'focal_mm', 'max_aperture', 'min_aperture_f', 'focus', 'close_focus', 'quick', 'sources'],
  properties: {
    id: str, name: str, short: str,
    mount: { enum: ['Z', 'F'] },
    coverage: { enum: ['FX', 'DX'] },
    kind: { enum: ['zoom', 'prime', 'macro'] },
    focal_mm: { type: 'array', items: num, minItems: 1, maxItems: 2 },
    max_aperture: { type: 'array', minItems: 1, items: { type: 'object', required: ['focal_mm', 'f'], properties: { focal_mm: num, f: num } } },
    min_aperture_f: num,
    focus: { type: 'object', required: ['on_z_body', 'cpu'], properties: { on_z_body: str, cpu: { type: ['boolean', 'null'] } } },
    close_focus: {
      type: 'object',
      required: ['mfd_m', 'max_mag', 'camera_displays_effective'],
      properties: { mfd_m: focalVals, max_mag: focalVals, working_distance_mm_at_max_mag: numN, camera_displays_effective: { type: ['boolean', 'null'] } },
    },
    quick: {
      type: 'object',
      required: ['headline', 'by_focal', 'avoid', 'confidence'],
      properties: {
        headline: str, sweet_spot: strN, close_up_best: strN, diffraction_note: strN,
        confidence: { enum: ['high', 'medium', 'low'] },
        avoid: { type: 'array', items: str },
        by_focal: { type: 'array', items: { type: 'object', required: ['focal_mm'], properties: { focal_mm: num, center_peak: strN, corners_peak: strN } } },
      },
    },
    tc_compatible: { type: ['boolean', 'null'] },
    sources: { type: 'array', items: source },
    chris_frost: { type: 'object', required: ['access'], properties: { access: str, url: strN } },
  },
}

const bodySchema = {
  type: 'object',
  required: ['id', 'name', 'format', 'sensor', 'ibis', 'shutter', 'special_features', 'sources'],
  properties: {
    id: { enum: ['z8', 'z5ii', 'z50ii'] }, name: str, format: { enum: ['FX', 'DX'] },
    sensor: { type: 'object', required: ['width_px', 'height_px', 'width_mm', 'height_mm', 'pixel_pitch_um'], properties: { width_px: num, height_px: num, width_mm: num, height_mm: num, pixel_pitch_um: num } },
    special_features: { type: 'array', items: { type: 'object', required: ['name', 'available'], properties: { name: str, available: { type: 'boolean' } } } },
    sources: { type: 'array', items: source },
  },
}

const settingSchema = {
  type: 'object',
  required: ['id', 'group', 'name', 'available_on', 'menu_path', 'one_liner', 'options', 'suggested', 'sources'],
  properties: {
    id: str, group: str, name: str,
    available_on: { type: 'array', items: { enum: ['z8', 'z5ii', 'z50ii'] } },
    menu_path: { type: 'object' },
    one_liner: str,
    options: { type: 'array', items: { type: 'object', required: ['value'], properties: { value: str } } },
    suggested: { type: 'array', items: { type: 'object', required: ['scenario_id', 'value'], properties: { scenario_id: { enum: ['dance', 'birds', 'kids', 'landscape', 'macro', 'moonrise', 'video'] }, value: str } } },
    related: { type: 'array', items: str },
  },
}

const ajv = new Ajv({ allErrors: true, strict: false })
const vLens = ajv.compile(lensSchema)
const vBody = ajv.compile(bodySchema)
const vSetting = ajv.compile(settingSchema)

const errors: string[] = []
const warnings: string[] = []
const err = (m: string) => errors.push(m)
const warn = (m: string) => warnings.push(m)
const fmt = (e: any[] | null | undefined) => (e ?? []).map((x) => `${x.instancePath || '/'} ${x.message}`).join('; ')

function checkUrls(where: string, sources: any[] | undefined) {
  for (const s of sources ?? []) {
    if (s.url === undefined || s.url === null) continue
    if (typeof s.url !== 'string' || s.url === '' || !s.url.startsWith('https://')) err(`${where}: source "${s.name}" url must be https or null, got ${JSON.stringify(s.url)}`)
  }
}

const kit = read('data/kit.json')
const kitLensIds: string[] = kit.lens_groups.flatMap((g: any) => g.lenses)
const lensFiles = list('data/lenses').map((f) => f.replace(/\.json$/, ''))

for (const id of kitLensIds) if (!lensFiles.includes(id)) err(`kit.json lists lens "${id}" but data/lenses/${id}.json is missing`)
for (const id of lensFiles) if (!kitLensIds.includes(id)) err(`data/lenses/${id}.json is not listed in kit.json`)
if (new Set(kitLensIds).size !== kitLensIds.length) err('kit.json lists a lens more than once')

for (const f of lensFiles) {
  const l = read(`data/lenses/${f}.json`)
  const where = `lenses/${f}`
  if (l.id !== f) err(`${where}: id "${l.id}" does not match file name`)
  if (!vLens(l)) err(`${where}: ${fmt(vLens.errors)}`)
  checkUrls(where, l.sources)
  const q = l.quick
  if (q) {
    if (!l.sources?.length) err(`${where}: quick block has no sources`)
    const measured = (l.sources ?? []).filter((s: any) => s.kind === 'measured').length
    if (q.confidence === 'high' && measured < 2) err(`${where}: confidence "high" needs ≥ 2 measured sources, has ${measured}`)
    if (!q.sweet_spot) warn(`${where}: no quick.sweet_spot`)
    if (!q.by_focal?.length) warn(`${where}: no quick.by_focal`)
    if (!q.close_up_best) warn(`${where}: no quick.close_up_best`)
  }
  if (l.tc_compatible === null || l.tc_compatible === undefined) warn(`${where}: tc_compatible not set`)
  if (!l.close_focus?.max_mag?.length) warn(`${where}: no close_focus.max_mag`)
}

// Per-lens sharpness curves (data/lens-curves.json): same parser the app uses, so what passes here loads there.
let curveCount = 0
try {
  const raw = read('data/lens-curves.json')
  const { lenses: parsed, fileError } = parseCurveFile(raw)
  if (fileError) err(fileError)
  for (const id of kitLensIds) if (!parsed.has(id)) err(`lens-curves.json has no entry for "${id}"`)
  for (const [id, r] of parsed) {
    if (!kitLensIds.includes(id)) { err(`lens-curves.json has an entry for "${id}" which is not in kit.json`); continue }
    if (!r.ok) { r.errors.forEach((m) => err(`lens-curves.json: ${m}`)); continue }
    const lens = read(`data/lenses/${id}.json`)
    const lo = Math.min(...lens.focal_mm)
    const hi = Math.max(...lens.focal_mm)
    const groups = new Map<string, number>()
    for (const e of r.data.entries) {
      curveCount++
      const shown = e.raw.focal_mm
      const base = e.raw.tc ? shown / 1.4 : shown
      if (base < lo * 0.97 || base > hi * 1.03) warn(`lens-curves#${id}: ${shown} mm${e.raw.tc ? ' (with TC)' : ''} is outside the lens range ${lo}–${hi} mm`)
      if (e.raw.tc && lens.tc_compatible !== true) warn(`lens-curves#${id}: has a with-converter entry but the lens is not TC-compatible`)
      if (e.raw.confidence === 'measured' && e.downhill == null) warn(`lens-curves#${id} ${shown} mm: confidence "measured" but downhillFrom is null (the fallback will be used; mark it inferred)`)
      const k = `${!!e.raw.tc}/${e.raw.mag ?? 'inf'}`
      groups.set(k, (groups.get(k) ?? 0) + 1)
    }
    for (const [k, n] of groups) if (n > 3) warn(`lens-curves#${id}: ${n} entries for ${k}; the brief allows wide / mid / long`)
    if (lens.kind === 'zoom' && !r.data.entries.some((e) => !e.raw.tc)) warn(`lens-curves#${id}: a zoom with no bare-lens entry`)
  }
} catch (e) {
  err(`lens-curves.json could not be read: ${(e as Error).message}`)
}

const bodyIds: string[] = kit.bodies.map((b: any) => b.id)
for (const id of bodyIds) {
  let b: any
  try { b = read(`data/bodies/${id}.json`) } catch { err(`kit.json lists body "${id}" but data/bodies/${id}.json is missing`); continue }
  if (!vBody(b)) err(`bodies/${id}: ${fmt(vBody.errors)}`)
  checkUrls(`bodies/${id}`, b.sources)
}

const settingIds = new Set<string>()
const allSettings: any[] = []
for (const f of list('data/settings')) {
  const arr = read(`data/settings/${f}`)
  if (!Array.isArray(arr)) { err(`settings/${f}: must be an array`); continue }
  for (const s of arr) {
    const where = `settings/${f}#${s.id}`
    if (settingIds.has(s.id)) err(`${where}: duplicate setting id`)
    settingIds.add(s.id)
    allSettings.push(s)
    if (!vSetting(s)) err(`${where}: ${fmt(vSetting.errors)}`)
    checkUrls(where, s.sources)
    for (const b of s.available_on ?? []) if (!s.menu_path?.[b]) warn(`${where}: available on ${b} but no menu_path`)
  }
}
for (const s of allSettings) for (const r of s.related ?? []) if (!settingIds.has(r)) warn(`settings#${s.id}: related "${r}" does not exist`)

for (const f of list('data/accessories')) {
  const a = read(`data/accessories/${f}`)
  if (!a.id || !a.name) err(`accessories/${f}: needs id and name`)
  checkUrls(`accessories/${f}`, a.sources)
}

console.log(`lenses ${lensFiles.length}, curve entries ${curveCount}, bodies ${bodyIds.length}, settings ${allSettings.length}`)
if (warnings.length) { console.log(`\nWARNINGS (${warnings.length})`); warnings.forEach((w) => console.log('  - ' + w)) }
if (errors.length) { console.log(`\nERRORS (${errors.length})`); errors.forEach((e) => console.log('  - ' + e)); process.exit(1) }
console.log('data validation OK')
