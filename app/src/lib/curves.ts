// Per-lens sharpness-vs-aperture curves (change brief v1.5). Pure functions, no I/O, no bundler features,
// so the same code validates data/lens-curves.json at build time (scripts/validate-data.ts) and at app start.
//
// Model: each lens rises to a peak (lens-specific), then diffraction pulls it down (same for every lens).
// The data holds review verdicts and aperture ranges, never numeric sharpness, so nothing here has a y-axis value.
import { type ApRange, fmtF, snapThird } from './optics'

export type CurveConfidence = 'measured' | 'inferred'
export type InferrableField = 'centerPeak' | 'cornerPeak' | 'downhillFrom' | 'clearlySofter'
const INFERRABLE: InferrableField[] = ['centerPeak', 'cornerPeak', 'downhillFrom', 'clearlySofter']

export interface CurveSource { name: string; url: string | null; testBody: string | null }

export interface CurveEntry {
  focal_mm: number
  /** True for a result measured with the TC-1.4x on; focal_mm is then the displayed focal length. */
  tc?: boolean
  /** Magnification this entry applies to ("inf", "1:2", "1:1", "2:1"). Only for lenses whose camera display already includes the close-focus loss. */
  mag?: string
  wideOpen: string
  centerPeak: string | null
  cornerPeak: string | null
  overallPeak?: string | null
  downhillFrom: string | null
  clearlySofter: string | null
  /** Widest displayed aperture for this entry when it differs from the lens maximum (MC 105 at 1:1 reads f/4.5). */
  startAt?: number
  /** True when the research says the corners never reach the centre's level. Only changes the drawn curve. */
  cornersNeverMatch?: boolean
  source: string
  confidence: CurveConfidence
  /** Which fields are inferred. Omitted on an inferred entry means all of them. */
  inferredFields?: InferrableField[]
  note?: string
}

export interface MacroCfg {
  /** nominal: the camera shows the set aperture, so the strip shifts at close range. displayed: the camera already shows the effective one. */
  mode: 'nominal' | 'displayed'
  magnifications: string[]
  /** Lens-specific loss at 1:1 in stops of light, when researched. Otherwise the generic 1 + m is used. */
  lossAt1to1Stops?: number
}

export interface LensCurves {
  lastUpdated: string
  macro?: MacroCfg
  sources: CurveSource[]
  entries: CurveEntry[]
}

export interface ParsedEntry {
  raw: CurveEntry
  center: ApRange | null
  corner: ApRange | null
  overallPeak: ApRange | null
  downhill: number | null
  clearly: number | null
}
export interface ParsedLens extends Omit<LensCurves, 'entries'> { entries: ParsedEntry[] }

export type CurveResult = { ok: true; data: ParsedLens } | { ok: false; errors: string[] }

// ---------------------------------------------------------------------------
// Validation (one lens at a time, so one broken entry never takes the others down)
// ---------------------------------------------------------------------------

const RANGE_RE = /^f\/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(?:f\/)?(\d+(?:\.\d+)?))?$/
/** Strict "f/8" or "f/5.6–f/8". Undefined when the text is not exactly that. */
export function parseStrict(s: unknown): ApRange | undefined {
  if (typeof s !== 'string') return undefined
  const m = RANGE_RE.exec(s.trim())
  if (!m) return undefined
  const a = parseFloat(m[1])
  const b = m[2] ? parseFloat(m[2]) : a
  if (!(a > 0.5 && b > 0.5 && a < 128 && b < 128) || b < a) return undefined
  return { lo: a, hi: b }
}

export const MAG_VALUE: Record<string, number> = { inf: 0, '1:2': 0.5, '1:1': 1, '2:1': 2 }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function parseLensCurves(id: string, raw: unknown): CurveResult {
  const errors: string[] = []
  const bad = (m: string) => errors.push(`${id}: ${m}`)
  if (!isObj(raw)) return { ok: false, errors: [`${id}: entry is not an object`] }

  if (typeof raw.lastUpdated !== 'string' || !DATE_RE.test(raw.lastUpdated)) bad('lastUpdated must be a date like 2026-11-05')
  if (!Array.isArray(raw.sources)) bad('sources must be an array')
  else
    raw.sources.forEach((s, i) => {
      if (!isObj(s) || typeof s.name !== 'string' || !s.name) return bad(`sources[${i}] needs a name`)
      if (s.url != null && (typeof s.url !== 'string' || !s.url.startsWith('https://'))) bad(`sources[${i}] url must be https or null`)
      if (s.testBody != null && typeof s.testBody !== 'string') bad(`sources[${i}] testBody must be text or null`)
    })

  let macro: MacroCfg | undefined
  if (raw.macro != null) {
    const mc = raw.macro
    if (!isObj(mc) || (mc.mode !== 'nominal' && mc.mode !== 'displayed')) bad('macro.mode must be "nominal" or "displayed"')
    else if (!Array.isArray(mc.magnifications) || !mc.magnifications.length || mc.magnifications.some((m) => typeof m !== 'string' || !(m in MAG_VALUE)))
      bad('macro.magnifications must list some of inf, 1:2, 1:1, 2:1')
    else if (mc.lossAt1to1Stops != null && (typeof mc.lossAt1to1Stops !== 'number' || mc.lossAt1to1Stops < 0 || mc.lossAt1to1Stops > 5))
      bad('macro.lossAt1to1Stops must be a number from 0 to 5')
    else macro = mc as unknown as MacroCfg
  }

  const entries: ParsedEntry[] = []
  if (!Array.isArray(raw.entries) || !raw.entries.length) bad('entries must be a non-empty array')
  else
    raw.entries.forEach((e, i) => {
      const w = `entries[${i}]${isObj(e) && typeof e.focal_mm === 'number' ? ` (${e.focal_mm} mm)` : ''}`
      const before = errors.length
      const err = (m: string) => bad(`${w}: ${m}`)
      if (!isObj(e)) return err('not an object')
      if (typeof e.focal_mm !== 'number' || !(e.focal_mm > 0)) err('focal_mm must be a positive number')
      if (typeof e.wideOpen !== 'string' || !e.wideOpen.trim()) err('wideOpen must be a one-line text')
      if (typeof e.source !== 'string' || !e.source.trim()) err('source must be text')
      if (e.confidence !== 'measured' && e.confidence !== 'inferred') err('confidence must be "measured" or "inferred"')
      if (e.tc != null && typeof e.tc !== 'boolean') err('tc must be true or false')
      if (e.cornersNeverMatch != null && typeof e.cornersNeverMatch !== 'boolean') err('cornersNeverMatch must be true or false')
      if (e.startAt != null && (typeof e.startAt !== 'number' || !(e.startAt >= 0.7 && e.startAt <= 64))) err('startAt must be an f-number')
      if (e.note != null && typeof e.note !== 'string') err('note must be text')
      if (e.mag != null) {
        if (typeof e.mag !== 'string' || !(e.mag in MAG_VALUE)) err('mag must be one of inf, 1:2, 1:1, 2:1')
        else if (macro && !macro.magnifications.includes(e.mag)) err(`mag ${e.mag} is not listed in macro.magnifications`)
        else if (!macro) err('mag is set but the lens has no macro block')
      }
      if (e.inferredFields != null) {
        if (!Array.isArray(e.inferredFields) || e.inferredFields.some((f) => !INFERRABLE.includes(f as InferrableField))) err(`inferredFields may only list ${INFERRABLE.join(', ')}`)
        else if (e.confidence !== 'inferred') err('inferredFields only makes sense with confidence "inferred"')
      }

      const rng = (k: string, single: boolean, optional = false): ApRange | null => {
        const v = e[k]
        if (v == null) {
          if (v === undefined && !optional) err(`${k} is missing (use null when unknown)`)
          return null
        }
        const r = parseStrict(v)
        if (!r) { err(`${k} "${String(v)}" is not an aperture like f/8${single ? '' : ' or f/5.6–f/8'}`); return null }
        if (single && r.lo !== r.hi) { err(`${k} must be a single f-number`); return null }
        return r
      }
      const center = rng('centerPeak', false)
      const corner = rng('cornerPeak', false)
      const overall = rng('overallPeak', false, true)
      const dh = rng('downhillFrom', true)
      const cs = rng('clearlySofter', true)
      if (dh && cs && cs.lo < dh.lo) err('clearlySofter comes before downhillFrom')
      if (!center && !corner && !overall && e.confidence === 'measured') err('no peak at all: mark the entry inferred, or give centerPeak/cornerPeak/overallPeak')
      if ((dh == null) !== (cs == null) && dh == null && cs != null) err('clearlySofter is set but downhillFrom is null')
      if (errors.length === before) entries.push({ raw: e as unknown as CurveEntry, center, corner, overallPeak: overall, downhill: dh?.lo ?? null, clearly: cs?.lo ?? null })
    })

  if (errors.length) return { ok: false, errors }
  return { ok: true, data: { lastUpdated: raw.lastUpdated as string, macro, sources: raw.sources as CurveSource[], entries } }
}

/** Parse the whole file; a broken lens becomes an error result for that lens only. */
export function parseCurveFile(raw: unknown): { lenses: Map<string, CurveResult>; fileError: string | null } {
  const lenses = new Map<string, CurveResult>()
  if (!isObj(raw) || !isObj(raw.lenses)) return { lenses, fileError: 'lens-curves.json has no "lenses" object' }
  for (const [id, v] of Object.entries(raw.lenses)) lenses.set(id, parseLensCurves(id, v))
  return { lenses, fileError: null }
}

// ---------------------------------------------------------------------------
// Choosing the entry: teleconverter, magnification, focal length
// ---------------------------------------------------------------------------

export type Role = 'wide' | 'mid' | 'long'
export interface Pick {
  entry: ParsedEntry
  /** Entries the selector offers (same tc/mag), sorted by focal length. */
  options: { entry: ParsedEntry; role: Role | null }[]
  /** False when the shown focal length is not one the research covered. */
  exact: boolean
  /** TC is on but the lens has no with-converter entry, so the bare-lens entry is shown. */
  tcMissing: boolean
}

export function pickEntry(data: ParsedLens, opts: { focal: number; tc: boolean; mag: string }): Pick | null {
  const hasTc = data.entries.some((e) => e.raw.tc)
  const useTc = opts.tc && hasTc
  let pool = data.entries.filter((e) => !!e.raw.tc === useTc)
  if (data.macro) {
    const same = pool.filter((e) => (e.raw.mag ?? 'inf') === opts.mag)
    pool = same.length ? same : pool.filter((e) => (e.raw.mag ?? 'inf') === 'inf')
  }
  if (!pool.length) pool = data.entries
  if (!pool.length) return null
  const sorted = pool.slice().sort((a, b) => a.raw.focal_mm - b.raw.focal_mm)
  let best = sorted[0]
  for (const e of sorted) if (Math.abs(Math.log(e.raw.focal_mm / opts.focal)) < Math.abs(Math.log(best.raw.focal_mm / opts.focal))) best = e
  const roles = (n: number, i: number): Role | null => (n === 1 ? null : i === 0 ? 'wide' : i === n - 1 ? 'long' : 'mid')
  return {
    entry: best,
    options: sorted.map((entry, i) => ({ entry, role: roles(sorted.length, i) })),
    exact: Math.abs(Math.log(best.raw.focal_mm / opts.focal)) < 0.03,
    tcMissing: opts.tc && !hasTc,
  }
}

// ---------------------------------------------------------------------------
// Overall = the whole frame (spec §2)
// ---------------------------------------------------------------------------

export const FULL_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32]

/** Last full stop before an aperture. */
export function stopBefore(n: number): number {
  let r = FULL_STOPS[0]
  for (const s of FULL_STOPS) if (s < n * 0.97) r = s
  return r
}

export interface Overall { range: ApRange | null; derived: boolean }

/**
 * overallPeak wins. Otherwise the overlap of centre and corner peaks. With no overlap, where the corners catch up
 * (the later of the two starts) as long as that is before the drop-off; else the last stop before it.
 */
export function overallRange(e: ParsedEntry, downhill: number | null): Overall {
  if (e.overallPeak) return { range: e.overallPeak, derived: false }
  const { center, corner } = e
  if (!center || !corner) return { range: null, derived: false }
  const lo = Math.max(center.lo, corner.lo)
  const hi = Math.min(center.hi, corner.hi)
  if (lo <= hi) return { range: { lo, hi }, derived: true }
  const start = lo
  if (downhill == null || start < downhill) return { range: { lo: start, hi: start }, derived: true }
  const last = stopBefore(downhill)
  return { range: { lo: last, hi: last }, derived: true }
}

// ---------------------------------------------------------------------------
// Close-focus and teleconverter translation: curves are in effective f-numbers, the strip shows what you dial in
// ---------------------------------------------------------------------------

/** Loss factor on the f-number at magnification m. Lens-specific when the research gives the 1:1 loss, else 1 + m. Snapped to third stops of light. */
export function closeFocusFactor(m: number, lossAt1to1Stops?: number): number {
  if (m <= 0) return 1
  const f1 = lossAt1to1Stops != null ? Math.pow(2, lossAt1to1Stops / 2) : 2
  const raw = 1 + m * (f1 - 1)
  const stops = Math.round(2 * Math.log2(raw) * 3) / 3
  return Math.pow(2, stops / 2)
}

// ---------------------------------------------------------------------------
// The aperture strip
// ---------------------------------------------------------------------------

export type CellKind = 'rising' | 'peak' | 'fine' | 'downhill' | 'soft' | 'unknown'
export interface Cell { n: number; eff: number; kind: CellKind; dashed: boolean }
export interface Row {
  key: 'overall' | 'center' | 'corners'
  /** Peak range in the apertures you dial in (after any close-focus shift). Null = not measured. */
  range: ApRange | null
  derived: boolean
  cells: Cell[]
}

/** Half a third of a stop, in stops of light: ranges quoted in reviews are rounded to nearby stops. */
const EPS_EV = 0.3
const ev = (a: number, b: number) => 2 * Math.log2(a / b)
const atLeast = (eff: number, x: number) => ev(eff, x) >= -EPS_EV
const atMost = (eff: number, x: number) => ev(eff, x) <= EPS_EV

export function classify(eff: number, peak: ApRange | null, downhill: number, clearly: number | null): CellKind {
  if (peak && atLeast(eff, peak.lo) && atMost(eff, peak.hi)) return 'peak'
  if (clearly != null && atLeast(eff, clearly)) return 'soft'
  if (atLeast(eff, downhill)) return 'downhill'
  if (!peak) return 'unknown'
  return eff > peak.hi ? 'fine' : 'rising'
}

/** Strip apertures: the widest one, then each full stop more than a third of a stop beyond it, up to the end. */
export function stripApertures(start: number, end: number): number[] {
  const out = [start]
  for (const s of FULL_STOPS) if (s > start * 1.15 && s <= end * 1.04) out.push(s)
  return out
}

export interface FallbackInfo { downhill: number; clearly: number | null; used: boolean }
/** Spec §4: where a lens is past its peak whatever the lens. f/11 on FX, f/7.1 for DX-coverage lenses and on the Z50 II; one stop later for the clear drop. */
export function dropOff(e: ParsedEntry, dxContext: boolean): FallbackInfo {
  if (e.downhill != null) return { downhill: e.downhill, clearly: e.clearly, used: false }
  const downhill = dxContext ? 7.1 : 11
  return { downhill, clearly: snapThird(downhill * Math.SQRT2), used: true }
}

export interface CurveModel {
  entry: ParsedEntry
  start: number
  end: number
  factor: number
  magLabel: string
  apertures: number[]
  overall: Row
  center: Row
  corners: Row
  /** Effective apertures (before the close-focus shift). */
  downhillEff: number
  clearlyEff: number | null
  fallback: boolean
  inferredPeaks: boolean
  recommendation: string
  /** Every aperture on the strip is already past the drop-off (Laowa at 2:1). */
  allPastPeak: boolean
}

const fieldInferred = (e: CurveEntry, f: InferrableField) => e.confidence === 'inferred' && (!e.inferredFields || e.inferredFields.includes(f))

export interface BuildOpts {
  /** Widest displayed aperture on this lens at this focal length (TC applied). */
  widest: number
  /** Narrowest displayed aperture (TC applied). */
  narrowest: number
  dxContext: boolean
  /** Close-focus factor from closeFocusFactor(); 1 for everything else. */
  factor?: number
  magLabel?: string
}

export function buildCurveModel(entry: ParsedEntry, o: BuildOpts): CurveModel {
  const factor = o.factor ?? 1
  const start = entry.raw.startAt ?? o.widest
  const end = Math.max(start, Math.min(22, o.narrowest))
  const apertures = stripApertures(start, end)
  const drop = dropOff(entry, o.dxContext)
  const ov = overallRange(entry, drop.downhill)
  const toSet = (n: number) => Math.max(start, snapThird(n / factor))
  const setRange = (r: ApRange | null): ApRange | null => (r ? { lo: toSet(r.lo), hi: toSet(r.hi) } : null)

  const dhInf = fieldInferred(entry.raw, 'downhillFrom') || drop.used
  const mkRow = (key: Row['key'], peak: ApRange | null, derived: boolean, peakInferred: boolean): Row => ({
    key,
    range: setRange(peak),
    derived,
    cells: apertures.map((n) => {
      const eff = n * factor
      const kind = classify(eff, peak, drop.downhill, drop.clearly)
      const dashed = (dhInf && (kind === 'downhill' || kind === 'soft' || kind === 'fine')) || (peakInferred && (kind === 'peak' || kind === 'rising' || kind === 'unknown'))
      return { n, eff, kind, dashed }
    }),
  })
  const cInf = fieldInferred(entry.raw, 'centerPeak')
  const kInf = fieldInferred(entry.raw, 'cornerPeak')
  const overall = mkRow('overall', ov.range, ov.derived, cInf || kInf)
  const center = mkRow('center', entry.center, false, cInf)
  const corners = mkRow('corners', entry.corner, false, kInf)

  const allPastPeak = overall.cells.every((c) => c.kind === 'downhill' || c.kind === 'soft')
  const model: CurveModel = {
    entry, start, end, factor, magLabel: o.magLabel ?? '', apertures, overall, center, corners,
    downhillEff: drop.downhill, clearlyEff: drop.clearly, fallback: drop.used,
    inferredPeaks: cInf || kInf, recommendation: '', allPastPeak,
  }
  model.recommendation = recommend(model, ov.range)
  return model
}

/** One plain-language line, in the apertures you dial in (spec §2). */
function recommend(m: CurveModel, ov: ApRange | null): string {
  const f = fmtF
  const set = (n: number) => Math.max(m.start, snapThird(n / m.factor))
  if (m.allPastPeak && m.factor > 1) {
    const a = m.apertures
    return `Diffraction-limited at any aperture at ${m.magLabel}: stay at ${f(a[0])}${a[1] ? `–${f(a[1])}` : ''} and focus-stack.`
  }
  const parts: string[] = []
  const whole = ov ? set(ov.hi) : null
  if (whole != null) parts.push(`Landscape with corners: ${f(whole)}.`)
  else parts.push('Sharpest aperture not measured for this lens.')
  if (m.entry.center && !m.entry.overallPeak) {
    const c = set(m.entry.center.lo)
    if (whole == null || c !== whole) parts.push(`Center only: ${f(c)}.`)
  }
  const dh = set(m.downhillEff)
  if (dh <= m.end * 1.04 && (whole == null || dh > whole)) parts.push(`${m.fallback ? 'Expect a drop from' : 'Fine for depth of field:'} ${f(dh)}${m.fallback ? ' (inferred).' : '.'}`)
  if (m.clearlyEff != null) {
    const cs = set(m.clearlyEff)
    if (cs <= m.end * 1.04) parts.push(`${f(cs)}+ only on purpose (depth of field, sunstars).`)
  }
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Curve shapes (spec §2 "Curve view"): built from the fields alone, no numeric sharpness
// ---------------------------------------------------------------------------

/** Position of an f-number on the strip, in cell units: cell i is centred on i, steps are one full stop (approximately). */
export function posOnStrip(n: number, apertures: number[]): number {
  const a = apertures
  if (a.length < 2) return 0
  const seg = (i: number) => Math.log(a[i + 1] / a[i])
  if (n <= a[0]) return Math.log(n / a[0]) / seg(0)
  for (let i = 0; i < a.length - 1; i++) if (n <= a[i + 1]) return i + Math.log(n / a[i]) / seg(i)
  const last = a.length - 2
  return a.length - 1 + Math.log(n / a[a.length - 1]) / seg(last)
}

interface Pt { x: number; y: number }

/** Monotone cubic Hermite through the points (no overshoot, so a flat top stays flat). */
export function monotone(pts: Pt[]): (x: number) => number {
  const n = pts.length
  const d: number[] = []
  const h: number[] = []
  for (let i = 0; i < n - 1; i++) { h[i] = pts[i + 1].x - pts[i].x; d[i] = (pts[i + 1].y - pts[i].y) / h[i] }
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0] ?? 0
  m[n - 1] = d[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  return (x) => {
    if (x <= pts[0].x) return pts[0].y
    if (x >= pts[n - 1].x) return pts[n - 1].y
    let i = 0
    while (x > pts[i + 1].x) i++
    const t = (x - pts[i].x) / h[i]
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * pts[i].y + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1].y + (t3 - t2) * h[i] * m[i + 1]
  }
}

export type CurveKind = 'center' | 'corners'
/** y runs 0 (bottom) to 1 (top). Only the shape means anything. */
export function curveFn(model: CurveModel, kind: CurveKind, peak: ApRange | null): (x: number) => number {
  const { apertures, factor } = model
  const N = apertures.length
  const pos = (nEff: number) => posOnStrip(nEff / factor, apertures)
  const top = kind === 'corners' && model.entry.raw.cornersNeverMatch ? 0.72 : 0.86
  const left = -0.5
  const right = N - 0.5
  const pts: Pt[] = []
  if (!peak) {
    // Not measured: a gentle rise that only the drop-off shapes, flagged by the caller.
    pts.push({ x: left, y: 0.5 }, { x: pos(model.downhillEff), y: 0.55 })
  } else {
    let lo = pos(peak.lo)
    let hi = pos(peak.hi)
    if (hi - lo < 0.5) { const mid = (lo + hi) / 2; lo = mid - 0.25; hi = mid + 0.25 }
    const atStart = lo <= 0.15
    const y0 = atStart ? top - (kind === 'corners' ? 0.08 : 0) : kind === 'corners' ? 0.4 : 0.62
    pts.push({ x: left, y: y0 })
    if (!atStart) pts.push({ x: lo * 0.55, y: y0 + 0.8 * (top - y0) })
    pts.push({ x: Math.max(lo, pts[pts.length - 1].x + 0.05), y: top }, { x: hi, y: top })
  }
  const lastX = () => pts[pts.length - 1].x
  const dhx = Math.max(pos(model.downhillEff), lastX() + 0.6)
  pts.push({ x: dhx, y: top - 0.07 })
  if (model.clearlyEff != null) {
    const csx = Math.max(pos(model.clearlyEff), dhx + 0.4)
    pts.push({ x: csx, y: top - 0.26 })
    pts.push({ x: Math.max(right, csx + 1.2), y: top - 0.52 })
  } else {
    pts.push({ x: Math.max(right, dhx + 1.2), y: top - 0.2 })
  }
  return monotone(pts)
}

export interface ChartModel {
  /** x positions in cell units from -0.5 to N-0.5 */
  domain: [number, number]
  center: (x: number) => number
  corners: (x: number) => number
  overall: (x: number) => number
  /** Peak bands to shade, in cell units. */
  overallBand: [number, number] | null
  centerBand: [number, number] | null
  cornerBand: [number, number] | null
  hasSplit: boolean
}

export function buildChart(model: CurveModel): ChartModel {
  const { entry, apertures, factor } = model
  const N = apertures.length
  const band = (r: ApRange | null): [number, number] | null =>
    r ? [Math.max(-0.5, posOnStrip(r.lo / factor, apertures) - 0.5), Math.min(N - 0.5, posOnStrip(r.hi / factor, apertures) + 0.5)] : null
  const ov = overallRange(entry, model.downhillEff)
  const hasSplit = !!(entry.center || entry.corner)
  const cPeak = entry.center ?? entry.overallPeak
  const kPeak = entry.corner ?? entry.overallPeak
  const center = curveFn(model, 'center', cPeak)
  const corners = curveFn(model, 'corners', kPeak)
  return {
    domain: [-0.5, N - 0.5],
    center, corners,
    overall: (x) => (center(x) + corners(x)) / 2,
    overallBand: band(ov.range),
    centerBand: band(entry.center),
    cornerBand: band(entry.corner),
    hasSplit,
  }
}
