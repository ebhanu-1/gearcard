// Change brief v1.5, section 7: acceptance tests for the per-lens sharpness curves, run as unit tests
// against the real data/lens-curves.json plus synthetic entries for the edge cases.
import { describe, expect, it } from 'vitest'
import { bodyById, curvesFor, dataWarnings, lensById, lenses } from '../src/lib/data'
import {
  buildChart, buildCurveModel, closeFocusFactor, overallRange, parseCurveFile, parseLensCurves, parseStrict, posOnStrip, stopBefore, type Row,
} from '../src/lib/curves'
import { buildCurveCard, buildLensCard } from '../src/lib/lensView'

type BodyId = 'z8' | 'z5ii' | 'z50ii'
const card = (lensId: string, focal: number | null = null, opts: { tc?: boolean; mag?: string; body?: BodyId } = {}) => {
  const lens = lensById(lensId)!
  const body = bodyById(opts.body ?? 'z8')
  const m = buildLensCard(lens, body, focal, !!opts.tc)
  return buildCurveCard(lens, body, m, curvesFor(lensId), opts.mag ?? 'inf')
}
const kinds = (r: Row) => r.cells.map((c) => `${c.n}:${c.kind}`)
const peaks = (r: Row) => r.cells.filter((c) => c.kind === 'peak').map((c) => c.n)
const range = (r: Row) => (r.range ? [r.range.lo, r.range.hi] : null)

describe('data file', () => {
  it('every kit lens has curve data and nothing is malformed', () => {
    expect(dataWarnings()).toEqual([])
    for (const l of lenses) expect(curvesFor(l.id)?.ok, l.id).toBe(true)
  })
})

describe('14-30 S (reference values from the brief)', () => {
  it('wide, Overall: green f/5.6–f/8 with the derived tag', () => {
    const m = card('z-14-30-f4-s', 14).model!
    expect(range(m.overall)).toEqual([5.6, 8])
    expect(m.overall.derived).toBe(true)
    expect(peaks(m.overall)).toEqual([5.6, 8])
  })
  it('long, Overall: green at f/8 (centre from f/5.6, corners f/8–f/11)', () => {
    const m = card('z-14-30-f4-s', 30).model!
    expect(range(m.overall)).toEqual([8, 8])
    expect(peaks(m.overall)).toEqual([8])
  })
  it('wide, Center row: amber f/4, green f/5.6–f/8, grey from f/11, dark grey from f/16', () => {
    const m = card('z-14-30-f4-s', 14).model!
    expect(kinds(m.center)).toEqual(['4:rising', '5.6:peak', '8:peak', '11:downhill', '16:soft', '22:soft'])
  })
  it('long, Corners row: green f/8–f/11', () => {
    const m = card('z-14-30-f4-s', 30).model!
    expect(peaks(m.corners)).toEqual([8, 11])
  })
  it('recommendation names f/8 for corners and f/5.6 for centre only', () => {
    const r = card('z-14-30-f4-s', 14).model!.recommendation
    expect(r).toBe('Landscape with corners: f/8. Center only: f/5.6. Fine for depth of field: f/11. f/16+ only on purpose (depth of field, sunstars).')
  })
  it('the selector offers wide / mid / long', () => {
    const p = card('z-14-30-f4-s', 14).pick!
    expect(p.options.map((o) => [o.role, o.entry.raw.focal_mm])).toEqual([['wide', 14], ['mid', 20], ['long', 30]])
  })
  it('curve view, wide: centre flat over f/5.6–f/8, corners below it, both falling after f/11, no y numbers', () => {
    const m = card('z-14-30-f4-s', 14).model!
    const ch = buildChart(m)
    const x = (n: number) => posOnStrip(n, m.apertures)
    expect(ch.center(x(5.6))).toBeCloseTo(ch.center(x(8)), 2)
    expect(ch.corners(x(8))).toBeLessThan(ch.center(x(8)))
    expect(ch.corners(x(4))).toBeLessThan(ch.center(x(4)))
    expect(ch.center(x(16))).toBeLessThan(ch.center(x(11)))
    expect(ch.center(x(11))).toBeLessThan(ch.center(x(8)))
    expect(ch.corners(x(22))).toBeLessThan(ch.corners(x(11)))
    expect(ch.overallBand).not.toBeNull()
  })
})

describe('teleconverter, macro lenses', () => {
  it('70-200 + TC-1.4x: strip starts at f/4 displayed, green f/5.6–f/8', () => {
    const c = card('z-70-200-f28-vr-s', 280, { tc: true })
    expect(c.pick!.entry.raw.tc).toBe(true)
    const m = c.model!
    expect(m.apertures[0]).toBe(4)
    expect(peaks(m.overall)).toEqual([5.6, 8])
    expect(m.fallback).toBe(true)
    expect(m.entry.raw.confidence).toBe('inferred')
  })
  it('MC 105 S at 1:1: strip starts at f/4.5, green f/5.6–f/8, no shift', () => {
    const c = card('z-mc-105-f28-vr-s', null, { mag: '1:1' })
    const m = c.model!
    expect(m.apertures[0]).toBe(4.5)
    expect(m.factor).toBe(1)
    expect(peaks(m.overall)).toEqual([5.6, 8])
    expect(m.overall.derived).toBe(false)
  })
  it('MC 105 S at infinity starts at f/2.8', () => {
    expect(card('z-mc-105-f28-vr-s', null, { mag: 'inf' }).model!.apertures[0]).toBe(2.8)
  })
  it('Tokina 100 at 1:1: strip shifted two stops, downhill starts two stops earlier', () => {
    const at = (mag: string) => card('tokina-100-f28-macro', null, { mag }).model!
    const first = (m: ReturnType<typeof at>) => m.center.cells.find((c) => c.kind === 'downhill' || c.kind === 'soft')!.n
    expect(at('inf').factor).toBe(1)
    expect(at('1:1').factor).toBeCloseTo(2)
    expect(first(at('inf'))).toBe(11)
    expect(first(at('1:1'))).toBe(5.6)
  })
  it('AF Micro 60 uses its own 1⅔-stop loss at 1:1', () => {
    expect(card('f-af-micro-60-f28d', null, { mag: '1:1' }).model!.factor).toBeCloseTo(Math.pow(2, 1.6667 / 2), 2)
  })
  it('Laowa 65 at 2:1: whole strip downhill with the focus-stack message', () => {
    const m = card('laowa-65-f28-2x-macro', null, { mag: '2:1' }).model!
    expect(m.overall.cells.every((c) => c.kind === 'downhill' || c.kind === 'soft')).toBe(true)
    expect(m.allPastPeak).toBe(true)
    expect(m.recommendation).toBe('Diffraction-limited at any aperture at 2:1: stay at f/2.8–f/4 and focus-stack.')
  })
  it('macro magnification options', () => {
    expect(card('laowa-65-f28-2x-macro').mags.map((x) => x.value)).toEqual(['inf', '1:2', '1:1', '2:1'])
    expect(card('tokina-100-f28-macro').mags.map((x) => x.value)).toEqual(['inf', '1:2', '1:1'])
    expect(card('z-50-f18-s').mags).toEqual([])
  })
})

describe('shift maths', () => {
  it('generic loss is 1 + m, in thirds of a stop (1:2 ≈ 1⅓, 1:1 = 2, 2:1 ≈ 3⅓ stops)', () => {
    const stops = (m: number) => Math.round(2 * Math.log2(closeFocusFactor(m)) * 3) / 3
    expect(stops(0)).toBe(0)
    expect(stops(0.5)).toBeCloseTo(1.333, 2)
    expect(stops(1)).toBe(2)
    expect(stops(2)).toBeCloseTo(3.333, 2)
  })
  it('a lens-specific loss wins', () => {
    expect(closeFocusFactor(1, 2)).toBeCloseTo(2)
    expect(closeFocusFactor(1, 1.67)).toBeLessThan(2)
  })
})

describe('Overall derivation', () => {
  const E = (c: string | null, k: string | null, dh: string | null = null) =>
    (parseLensCurves('t', {
      lastUpdated: '2026-01-01', sources: [],
      entries: [{ focal_mm: 50, wideOpen: 'x', centerPeak: c, cornerPeak: k, downhillFrom: dh, clearlySofter: null, source: 's', confidence: dh ? 'measured' : 'inferred' }],
    }) as any).data.entries[0]
  it('overlap → the overlap', () => expect(overallRange(E('f/5.6–f/8', 'f/5.6–f/8', 'f/11'), 11).range).toEqual({ lo: 5.6, hi: 8 }))
  it('no overlap → the start of the corner peak, if before the drop-off', () => {
    const o = overallRange(E('f/4–f/5.6', 'f/8', 'f/11'), 11)
    expect(o.range).toEqual({ lo: 8, hi: 8 })
    expect(o.derived).toBe(true)
  })
  it('no overlap and corners start at/after the drop-off → last stop before the drop-off', () => {
    expect(overallRange(E('f/4', 'f/11', 'f/11'), 11).range).toEqual({ lo: 8, hi: 8 })
    expect(stopBefore(7.1)).toBe(5.6)
  })
  it('an explicit overallPeak wins and is not tagged derived', () => {
    const e = (parseLensCurves('t', { lastUpdated: '2026-01-01', sources: [], entries: [{ focal_mm: 50, wideOpen: 'x', centerPeak: 'f/4', cornerPeak: 'f/8', overallPeak: 'f/5.6', downhillFrom: 'f/11', clearlySofter: null, source: 's', confidence: 'measured' }] }) as any).data.entries[0]
    expect(overallRange(e, 11)).toEqual({ range: { lo: 5.6, hi: 5.6 }, derived: false })
  })
})

describe('fallback when data is thin (spec §4)', () => {
  const thin = (coverage: 'FX' | 'DX', body: BodyId) => {
    const r = parseLensCurves('t', { lastUpdated: '2026-01-01', sources: [], entries: [{ focal_mm: 50, wideOpen: 'Not tested', centerPeak: null, cornerPeak: null, downhillFrom: null, clearlySofter: null, source: 'none', confidence: 'inferred' }] })
    if (!r.ok) throw new Error(r.errors.join())
    return buildCurveModel(r.data.entries[0], { widest: 1.8, narrowest: 22, dxContext: coverage === 'DX' || bodyById(body).format === 'DX' })
  }
  it('FX lens on FX body: peak not measured, downhill from f/11, clearly softer a stop later', () => {
    const m = thin('FX', 'z8')
    expect(m.overall.range).toBeNull()
    expect(m.center.range).toBeNull()
    expect(m.fallback).toBe(true)
    expect(m.entry.raw.confidence).toBe('inferred')
    expect(m.downhillEff).toBe(11)
    expect(m.clearlyEff).toBe(16)
    expect(m.overall.cells.find((c) => c.kind === 'downhill')!.n).toBe(11)
    expect(m.overall.cells.some((c) => c.kind === 'peak')).toBe(false)
    expect(m.overall.cells.find((c) => c.kind === 'downhill')!.dashed).toBe(true)
    expect(m.recommendation).toContain('not measured')
  })
  it('DX lens, or any lens on the Z50 II: downhill from f/7.1', () => {
    expect(thin('DX', 'z8').downhillEff).toBe(7.1)
    expect(thin('FX', 'z50ii').downhillEff).toBe(7.1)
  })
})

describe('validation: one broken entry never breaks the others', () => {
  it('a malformed lens becomes a data error for that lens only', () => {
    const good = { lastUpdated: '2026-01-01', sources: [], entries: [{ focal_mm: 50, wideOpen: 'x', centerPeak: 'f/5.6', cornerPeak: 'f/8', downhillFrom: 'f/11', clearlySofter: 'f/16', source: 's', confidence: 'measured' }] }
    const bad = { ...good, entries: [{ ...good.entries[0], centerPeak: 'about f/5.6' }] }
    const r = parseCurveFile({ lenses: { a: good, b: bad, c: { ...good, lastUpdated: 'yesterday' } } })
    expect(r.lenses.get('a')!.ok).toBe(true)
    expect(r.lenses.get('b')!.ok).toBe(false)
    expect(r.lenses.get('c')!.ok).toBe(false)
    expect((r.lenses.get('b') as any).errors[0]).toContain('centerPeak')
  })
  it('catches ordering and unknown-field mistakes', () => {
    const base = { focal_mm: 50, wideOpen: 'x', centerPeak: 'f/5.6', cornerPeak: 'f/8', downhillFrom: 'f/11', clearlySofter: 'f/16', source: 's', confidence: 'measured' }
    const mk = (over: object) => parseLensCurves('t', { lastUpdated: '2026-01-01', sources: [], entries: [{ ...base, ...over }] })
    expect(mk({}).ok).toBe(true)
    expect(mk({ clearlySofter: 'f/8' }).ok).toBe(false)
    expect(mk({ confidence: 'maybe' }).ok).toBe(false)
    expect(mk({ centerPeak: undefined }).ok).toBe(false)
    expect(mk({ mag: '1:1' }).ok).toBe(false)
  })
  it('a file that is not an object is reported, not thrown', () => {
    expect(parseCurveFile(null).fileError).toBeTruthy()
  })
  it('editing one value changes the card with no code change', () => {
    const raw = JSON.parse(JSON.stringify((curvesFor('z-14-30-f4-s') as any).data))
    // parsed data keeps the raw entries; rebuild from them with one value edited
    const entries = raw.entries.map((e: any) => ({ ...e.raw }))
    entries[0].centerPeak = 'f/4–f/5.6'
    entries[0].cornerPeak = 'f/4–f/5.6'
    const r = parseLensCurves('z-14-30-f4-s', { lastUpdated: '2026-12-01', sources: raw.sources, entries })
    expect(r.ok).toBe(true)
    const lens = lensById('z-14-30-f4-s')!
    const body = bodyById('z8')
    const c = buildCurveCard(lens, body, buildLensCard(lens, body, 14, false), r, 'inf')
    expect(range(c.model!.overall)).toEqual([4, 5.6])
    expect(c.lastUpdated).toBe('2026-12-01')
  })
})

describe('strict aperture parsing', () => {
  it('accepts f-numbers and ranges only', () => {
    expect(parseStrict('f/8')).toEqual({ lo: 8, hi: 8 })
    expect(parseStrict('f/5.6–f/8')).toEqual({ lo: 5.6, hi: 8 })
    expect(parseStrict('f/5.6-8')).toEqual({ lo: 5.6, hi: 8 })
    expect(parseStrict('f/8 (displayed)')).toBeUndefined()
    expect(parseStrict('8')).toBeUndefined()
    expect(parseStrict(null)).toBeUndefined()
  })
})

describe('every card builds', () => {
  it('all lenses × bodies × focal entries × magnifications give a model with at least two apertures', () => {
    for (const l of lenses) for (const b of ['z8', 'z5ii', 'z50ii'] as BodyId[]) for (const tc of [false, true]) {
      const c0 = card(l.id, null, { body: b, tc })
      expect(c0.status, l.id).toBe('ok')
      for (const mag of c0.mags.length ? c0.mags.map((x) => x.value) : ['inf']) {
        const c = card(l.id, null, { body: b, tc, mag })
        expect(c.model!.apertures.length, `${l.id} ${mag}`).toBeGreaterThan(1)
        const ch = buildChart(c.model!)
        for (const f of [ch.center, ch.corners, ch.overall]) for (let x = ch.domain[0]; x <= ch.domain[1]; x += 0.25) expect(Number.isFinite(f(x))).toBe(true)
      }
    }
  })
})
