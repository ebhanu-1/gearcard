import { describe, expect, it } from 'vitest'
import { bodies, bodyById, dataWarnings, lensById, lenses, settings } from '../src/lib/data'
import { buildLensCard, focalOptions } from '../src/lib/lensView'

const L = (id: string) => lensById(id)!
const card = (lens: string, body: 'z8' | 'z5ii' | 'z50ii', focal: number | null = null, tc = false) =>
  buildLensCard(L(lens), bodyById(body), focal, tc)

describe('data loads', () => {
  it('has the full kit and no startup warnings', () => {
    expect(lenses).toHaveLength(25)
    expect(bodies.map((b) => b.id)).toEqual(['z8', 'z5ii', 'z50ii'])
    expect(settings).toHaveLength(81)
    expect(dataWarnings()).toEqual([])
  })
})

describe('card basics', () => {
  it('Z50 II + Sigma 30 f/1.4: native DX, 1.5× equivalent, f/1.4 widest', () => {
    const m = card('sigma-30-f14-dc-dn', 'z50ii')
    expect(m.sensor.dxCrop).toBe(false)
    expect(m.equivFocal).toBe(46)
    expect(m.widest).toBe(1.4)
  })
  it('Z8 + DX lens runs in DX crop with a crop frame', () => {
    const m = card('z-dx-16-50-vr', 'z8')
    expect(m.sensor.dxCrop).toBe(true)
    expect(m.chips).toContain('DX crop')
    expect(m.equivFocal).not.toBeNull()
  })
  it('Z8 + 24-120: f/4 widest, f/22 narrowest', () => {
    const m = card('z-24-120-f4-s', 'z8', 24)
    expect([m.widest, m.narrowest]).toEqual([4, 22])
  })
})

describe('close-up block', () => {
  it('24-120 on Z8: 92 × 61 mm frame at 0.39×', () => {
    const c = card('z-24-120-f4-s', 'z8').closeUp
    expect(c.mag).toBeCloseTo(0.39)
    expect([Math.round(c.frameW), Math.round(c.frameH)]).toEqual([92, 61])
    expect(c.rows[0].dofPixelMm).toBeCloseTo(0.89, 2)
  })
  it('MC 105: camera displays effective aperture, so f/8 is not multiplied again', () => {
    const c = card('z-mc-105-f28-vr-s', 'z8').closeUp
    expect(c.displaysEffective).toBe(true)
    expect(c.rows[1].nEff).toBe(8)
    expect(c.rows[1].dofPixelMm).toBeCloseTo(0.14, 2)
  })
  it('Laowa 65 on Z8 at 2:1 set f/4 reads f/12 effective', () => {
    const c = card('laowa-65-f28-2x-macro', 'z8').closeUp
    expect(c.displaysEffective).toBe(false)
    expect(c.mag).toBe(2)
    expect(c.rows[0].nEff).toBeCloseTo(5.6 * 3)
  })
})

describe('teleconverter (§6.2)', () => {
  it('only the 70-200 and 180-600 offer it', () => {
    expect(lenses.filter((l) => l.tc_compatible === true).map((l) => l.id).sort()).toEqual(['z-180-600-vr', 'z-70-200-f28-vr-s'])
    expect(card('z-mc-105-f28-vr-s', 'z8', null, true).tc).toBe(false)
  })
  it('70-200 at 280 mm: f/4 widest, 0.28× closest', () => {
    const m = card('z-70-200-f28-vr-s', 'z8', 280, true)
    expect(m.tc).toBe(true)
    expect(m.focalApprox).toBe(false)
    expect(m.widest).toBe(4)
    expect(m.closest.mag).toBeCloseTo(0.28)
    expect(m.closest.mfdM).toBe(1)
  })
  it('70-200 at 98 mm with TC is an approximate focal length', () => {
    expect(card('z-70-200-f28-vr-s', 'z8', 98, true).focalApprox).toBe(true)
  })
  it('stepper focal lengths with TC are the bare ones × 1.4', () => {
    expect(focalOptions(L('z-70-200-f28-vr-s'), true).map((o) => o.shown)).toEqual([98, 147, 189, 280])
  })
  it('every lens × body builds without throwing, with and without TC', () => {
    for (const l of lenses) for (const b of bodies) {
      const m = buildLensCard(l, b, null, false)
      expect(m.narrowest).toBeGreaterThan(m.widest)
    }
    for (const id of ['z-70-200-f28-vr-s', 'z-180-600-vr'])
      for (const b of bodies) for (const o of focalOptions(L(id), true)) {
        const m = buildLensCard(L(id), b, o.shown, true)
        expect(m.narrowest).toBeGreaterThan(m.widest)
      }
  })
})
