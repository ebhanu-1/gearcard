// View model for the Lens Card: combines a lens, a body, a focal length and the TC state (SPEC §5.2, §6).
import type { Body, Lens } from './types'
import {
  type Sensor, DX_H_MM, DX_W_MM, TC_FACTOR, cropFactor, dofMm, effectiveAperture, frameMm, outputCoC_um, pixelCoC_um, snapThird,
} from './optics'
import {
  type CurveModel, type CurveResult, type CurveSource, type Pick, MAG_VALUE, buildCurveModel, closeFocusFactor, pickEntry,
} from './curves'

export function sensorFor(body: Body, lens: Lens): Sensor {
  const pitchUm = (body.sensor.width_mm / body.sensor.width_px) * 1000
  const dxCrop = body.format === 'FX' && lens.coverage === 'DX'
  return dxCrop
    ? { widthMm: DX_W_MM, heightMm: DX_H_MM, pitchUm, dxCrop }
    : { widthMm: body.sensor.width_mm, heightMm: body.sensor.height_mm, pitchUm, dxCrop }
}

/** Entry with the greatest focal length ≤ f, else the first. Steps, not interpolation: published tables are steps. */
function stepAt<T extends { focal_mm: number }>(list: T[], f: number): T | undefined {
  if (!list.length) return undefined
  const sorted = list.slice().sort((a, b) => a.focal_mm - b.focal_mm)
  let hit = sorted[0]
  for (const e of sorted) if (e.focal_mm <= f + 0.5) hit = e
  return hit
}

const isTcEntry = (s: string | null | undefined) => !!s && /TC-1\.4x|teleconverter/i.test(s)

export interface FocalOption {
  /** What the stepper shows (TC-adjusted). */
  shown: number
  /** Focal length on the bare lens. */
  base: number
  /** True when the value is not a measured entry (extrapolated or nearest). */
  approx: boolean
}

/** Focal lengths offered by the stepper: the lens's own `by_focal` entries; with TC, scaled by 1.4. */
export function focalOptions(lens: Lens, tc: boolean): FocalOption[] {
  if (lens.kind !== 'zoom') {
    const f = lens.focal_mm[0]
    return [{ shown: tc ? Math.round(f * TC_FACTOR) : f, base: f, approx: false }]
  }
  const bare = lens.quick.by_focal.filter((b) => !isTcEntry(b.center_peak) && !isTcEntry(b.corners_peak)).map((b) => b.focal_mm)
  const uniq = Array.from(new Set(bare.length ? bare : lens.focal_mm)).sort((a, b) => a - b)
  if (!tc) return uniq.map((f) => ({ shown: f, base: f, approx: false }))
  return uniq.map((f) => {
    const shown = Math.round(f * TC_FACTOR)
    const explicit = lens.quick.by_focal.find((b) => b.focal_mm === shown && (isTcEntry(b.center_peak) || isTcEntry(b.corners_peak)))
    return { shown, base: f, approx: !explicit }
  })
}

export interface CloseUp {
  mag: number
  magFocal: number | null
  mfdM: number | null
  frameW: number
  frameH: number
  workingDistanceMm: number | null
  displaysEffective: boolean | null
  /** True when the camera is treated as showing the nominal aperture (false or unverified). */
  nominal: boolean
  pupil: number
  cocPixelUm: number
  cocOutUm: number
  /** Rows for the DOF mini table. */
  rows: { setN: number; nEff: number; dofPixelMm: number; dofOutMm: number }[]
}

export interface LensCardModel {
  lens: Lens
  body: Body
  sensor: Sensor
  tc: boolean
  tcAvailable: boolean
  focal: number
  focalBase: number
  focalApprox: boolean
  equivFocal: number | null
  crop: number
  widest: number
  narrowest: number
  closest: { mag: number; atFocal: number | null; mfdM: number | null; est: boolean }
  closeUp: CloseUp
  chips: string[]
}

export function buildLensCard(lens: Lens, body: Body, focalWanted: number | null, tcWanted: boolean): LensCardModel {
  const tcAvailable = lens.tc_compatible === true
  const tc = tcAvailable && tcWanted
  const sensor = sensorFor(body, lens)

  const opts = focalOptions(lens, tc)
  const wanted = focalWanted ?? opts[opts.length - 1].shown
  let opt = opts[0]
  for (const o of opts) if (Math.abs(o.shown - wanted) < Math.abs(opt.shown - wanted)) opt = o
  const focalShown = lens.kind === 'zoom' ? (focalWanted ?? opt.shown) : opt.shown
  const focalBase = lens.kind === 'zoom' ? (tc ? focalShown / TC_FACTOR : focalShown) : opt.base
  const factor = tc ? TC_FACTOR : 1

  // Aperture range drawn on the strip, in displayed f-numbers.
  const maxAp = stepAt(lens.max_aperture, focalBase)?.f ?? lens.max_aperture[0].f
  const widest = snapThird(maxAp * factor)
  const narrowest = snapThird(lens.min_aperture_f * factor)

  const closeUp = buildCloseUp(lens, body, sensor, focalBase, tc)
  const mags = lens.close_focus.max_mag
  const best = mags.slice().sort((a, b) => b.value - a.value)[0]
  const mfd = best ? (stepAt(lens.close_focus.mfd_m, best.focal_mm)?.value ?? null) : (stepAt(lens.close_focus.mfd_m, focalBase)?.value ?? null)

  const crop = cropFactor(sensor)

  const chips: string[] = []
  if (/MF only/i.test(lens.focus.on_z_body)) chips.push('MF only on FTZ II')
  else if (/manual/i.test(lens.focus.on_z_body)) chips.push('Manual focus')
  if (lens.focus.cpu === false) chips.push('No CPU — enter focal length in Non-CPU lens data')
  if (lens.stabilization.synchro_vr) chips.push('Synchro VR')
  else if (lens.stabilization.lens_vr) chips.push('Lens VR')
  if (sensor.dxCrop) chips.push('DX crop')
  if (lens.adapter) chips.push(`via ${lens.adapter}`)

  return {
    lens, body, sensor, tc, tcAvailable,
    focal: focalShown, focalBase, focalApprox: opt.approx && lens.kind === 'zoom',
    equivFocal: crop > 1.05 ? Math.round(focalShown * crop) : null,
    crop, widest, narrowest,
    closest: {
      mag: best ? best.value * factor : 0,
      atFocal: best ? best.focal_mm : null,
      mfdM: mfd,
      est: tc || lens.kind === 'zoom',
    },
    closeUp,
    chips,
  }
}

function buildCloseUp(lens: Lens, body: Body, sensor: Sensor, focalBase: number, tc: boolean): CloseUp {
  const cf = lens.close_focus
  const best = cf.max_mag.slice().sort((a, b) => b.value - a.value)[0]
  const mag = (best?.value ?? 0) * (tc ? TC_FACTOR : 1)
  const f = frameMm(sensor, mag || 1)
  const displaysEffective = cf.camera_displays_effective
  const pupil = cf.pupil_magnification && cf.pupil_magnification > 0 ? cf.pupil_magnification : 1
  const cPix = pixelCoC_um(sensor)
  const cOut = outputCoC_um(sensor)
  const setNs = [5.6, 8, 11]
  const rows = setNs.map((n) => {
    const setN = tc ? n : n
    const nEff = effectiveAperture(setN, mag, displaysEffective === true, pupil)
    return { setN, nEff, dofPixelMm: mag ? dofMm(nEff, cPix, mag) : 0, dofOutMm: mag ? dofMm(nEff, cOut, mag) : 0 }
  })
  return {
    mag, magFocal: best?.focal_mm ?? null,
    mfdM: stepAt(cf.mfd_m, best?.focal_mm ?? focalBase)?.value ?? null,
    frameW: f.w, frameH: f.h,
    workingDistanceMm: cf.working_distance_mm_at_max_mag,
    displaysEffective,
    nominal: displaysEffective !== true,
    pupil, cocPixelUm: cPix, cocOutUm: cOut, rows,
  }
}

export interface CurveCard {
  status: 'ok' | 'missing' | 'error'
  errors: string[]
  model: CurveModel | null
  pick: Pick | null
  lastUpdated: string
  sources: CurveSource[]
  /** Magnification choices (macro lenses only), with the label to show. */
  mags: { value: string; label: string }[]
  mag: string
  /** Close-focus mode: nominal lenses shift the strip, displayed ones just switch entry. */
  macroMode: 'nominal' | 'displayed' | null
}

const NONE: CurveCard = { status: 'missing', errors: [], model: null, pick: null, lastUpdated: '', sources: [], mags: [], mag: 'inf', macroMode: null }

/** Turns a lens card, a magnification choice and the loaded curve data into everything the Sharpness section draws. */
export function buildCurveCard(lens: Lens, body: Body, m: LensCardModel, res: CurveResult | undefined, magWanted: string): CurveCard {
  if (!res) return NONE
  if (!res.ok) return { ...NONE, status: 'error', errors: res.errors }
  const data = res.data
  const macro = data.macro
  const mags = macro ? macro.magnifications.map((v) => ({ value: v, label: v === 'inf' ? '∞' : v })) : []
  const mag = macro && macro.magnifications.includes(magWanted) ? magWanted : 'inf'
  const hasTc = data.entries.some((e) => e.raw.tc)
  const useTc = m.tc && hasTc
  const pick = pickEntry(data, { focal: useTc ? m.focal : m.focalBase, tc: m.tc, mag })
  if (!pick) return { ...NONE, status: 'error', errors: [`${lens.id}: no usable entry`] }
  const e = pick.entry
  const baseFocal = e.raw.tc ? e.raw.focal_mm / TC_FACTOR : e.raw.focal_mm
  const tcFactor = e.raw.tc || m.tc ? TC_FACTOR : 1
  const maxAp = stepAt(lens.max_aperture, baseFocal)?.f ?? lens.max_aperture[0].f
  const factor = macro?.mode === 'nominal' ? closeFocusFactor(MAG_VALUE[mag] ?? 0, macro.lossAt1to1Stops) : 1
  const model = buildCurveModel(e, {
    widest: snapThird(maxAp * tcFactor),
    narrowest: snapThird(lens.min_aperture_f * tcFactor),
    dxContext: lens.coverage === 'DX' || body.format === 'DX',
    factor,
    magLabel: mag === 'inf' ? '∞' : mag,
  })
  return { status: 'ok', errors: [], model, pick, lastUpdated: data.lastUpdated, sources: data.sources, mags, mag, macroMode: macro?.mode ?? null }
}
