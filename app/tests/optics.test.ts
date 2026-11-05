import { describe, expect, it } from 'vitest'
import {
  cropFactor, dofMm, pixelPitchUm, effectiveAperture, frameMm,
  parseApRange, pixelCoC_um, snapThird, withTeleconverter, DX_H_MM, DX_W_MM, type Sensor,
} from '../src/lib/optics'

const z8: Sensor = { widthMm: 35.9, heightMm: 23.9, pitchUm: pixelPitchUm(35.9, 8256), dxCrop: false }
const z50: Sensor = { widthMm: 23.5, heightMm: 15.7, pitchUm: pixelPitchUm(23.5, 5568), dxCrop: false }
const z8dx: Sensor = { widthMm: DX_W_MM, heightMm: DX_H_MM, pitchUm: pixelPitchUm(35.9, 8256), dxCrop: true }
describe('§6.3 effective aperture (worked examples)', () => {
  it('Laowa 65 at 2:1, set f/4 → f/12', () => expect(effectiveAperture(4, 2, false)).toBe(12))
  it('AF Micro 60 at 1:1, set f/8 → ≈ f/16', () => expect(effectiveAperture(8, 1, false)).toBe(16))
  it('MC 105 at 1:1, camera shows f/8 → already effective', () => {
    expect(effectiveAperture(8, 1, true)).toBe(8)
  })
  it('honours a per-lens pupil magnification', () => expect(effectiveAperture(8, 1, false, 2)).toBeCloseTo(12))
})

describe('§6.4 close-up DOF', () => {
  it('Z8, m=1, set f/8 nominal display → ≈ 0.28 mm at 100%', () => {
    const nEff = effectiveAperture(8, 1, false)
    expect(dofMm(nEff, pixelCoC_um(z8), 1)).toBeCloseTo(0.28, 2)
  })
  it('Z8, m=1, camera shows f/8 (MC 105) → ≈ 0.14 mm', () => {
    expect(dofMm(effectiveAperture(8, 1, true), pixelCoC_um(z8), 1)).toBeCloseTo(0.14, 2)
  })
  it('matches the generated reference table for the 24-120 at 0.39×', () => {
    const nEff = effectiveAperture(5.6, 0.39, false)
    expect(nEff).toBeCloseTo(7.78, 2)
    expect(dofMm(nEff, pixelCoC_um(z8), 0.39)).toBeCloseTo(0.89, 2)
  })
})

describe('§6.5 / §6.6 frame and equivalent focal length', () => {
  it('24-120 at 0.39× on Z8 frames 92 × 61 mm', () => {
    const f = frameMm(z8, 0.39)
    expect(Math.round(f.w)).toBe(92)
    expect(Math.round(f.h)).toBe(61)
  })
  it('DX lens on Z8 uses the DX crop frame', () => expect(frameMm(z8dx, 0.2).w).toBeCloseTo(117.5, 1))
  it('crop factor: DX ≈ 1.53, FX = 1', () => {
    expect(cropFactor(z50)).toBeCloseTo(1.53, 2)
    expect(cropFactor(z8)).toBeCloseTo(1.003, 2)
  })
})

describe('§6.2 teleconverter', () => {
  it('70-200 f/4 at 200 mm, 0.2× → 280 mm f/5.6, 0.28×', () => {
    const r = withTeleconverter({ focal: 200, n: 4, mag: 0.2 })
    expect(r.focal).toBe(280)
    expect(r.n).toBeCloseTo(5.6)
    expect(r.mag).toBeCloseTo(0.28)
  })
})

describe('third-stop snapping (used by the curve shift)', () => {
  it('snaps to the nearest third', () => {
    expect(snapThird(15.56)).toBe(16)
    expect(snapThird(10.04)).toBe(10)
    expect(snapThird(2.8 * 2)).toBe(5.6)
  })
})

describe('aperture text parsing', () => {
  it('parses ranges and singles', () => {
    expect(parseApRange('f/5.6–f/8')).toEqual({ lo: 5.6, hi: 8 })
    expect(parseApRange('f/6')).toEqual({ lo: 6, hi: 6 })
    expect(parseApRange('f/9–f/11 (displayed, with TC-1.4x)')).toEqual({ lo: 9, hi: 11 })
    expect(parseApRange('f/2.8–f/4 (center); f/5.6 for corners')).toEqual({ lo: 2.8, hi: 4 })
  })
  it('returns null for prose', () => {
    expect(parseApRange('Wide open at 180–400mm; f/7.1–f/8 at 600mm')).toBeNull()
    expect(parseApRange(null)).toBeNull()
  })
})
