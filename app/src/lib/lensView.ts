// View model for the Lens Card: combines a lens, a body, a focal length and the TC state (SPEC §5.2, §6).
import type { Body, Lens } from './types'
import {
  type ApRange, type Bands, type Sensor, DX_H_MM, DX_W_MM, TC_FACTOR, bandSegments, bandThresholds, cropFactor,
  diffractionBands, dofMm, effectiveAperture, frameMm, outputCoC_um, parseApRange, pixelCoC_um, shiftRange, snapThird,
  sweetZone, THIRD_STOPS,
} from './optics'

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

export interface StripModel {
  /** Third-stop f-numbers drawn, widest → narrowest. */
  lo: number
  hi: number
  sweet: ApRange | null
  tint: ApRange | null
  bands: Bands
  segments: { from: number; level: number }[]
  thresholds: ReturnType<typeof bandThresholds>
  ticks: number[]
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
  rows: { setN: number; nEff: number; dofPixelMm: number; dofOutMm: number; level: number }[]
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
  strip: StripModel
  sharpest: ApRange | null
  sharpestApprox: boolean
  sharpestNote: string
  diffractionAt100: number
  closest: { mag: number; atFocal: number | null; mfdM: number | null; est: boolean }
  closeUp: CloseUp
  byFocalRow: { center: string; corners: string; note: string; exact: boolean } | null
  chips: string[]
}

export function buildLensCard(lens: Lens, body: Body, focalWanted: number | null, tcWanted: boolean): LensCardModel {
  const tcAvailable = lens.tc_compatible === true
  const tc = tcAvailable && tcWanted
  const sensor = sensorFor(body, lens)
  const bands = diffractionBands(sensor)

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

  // Lens sweet spot (displayed numbers).
  const byF = lens.quick.by_focal
  const explicit = tc ? byF.find((b) => b.focal_mm === Math.round(focalBase * TC_FACTOR) && (isTcEntry(b.center_peak) || isTcEntry(b.corners_peak))) : undefined
  const bareEntry = lens.kind === 'zoom' ? stepAt(byF.filter((b) => !isTcEntry(b.center_peak) && !isTcEntry(b.corners_peak)), focalBase) : byF[0]
  const entry = explicit ?? bareEntry
  let sweet: ApRange | null = null
  let sharpestApprox = false
  if (entry) {
    sweet = sweetZone(parseApRange(entry.center_peak), parseApRange(entry.corners_peak))
    if (sweet && tc && !explicit) {
      sweet = shiftRange(sweet, TC_FACTOR)
      sharpestApprox = true
    }
    if (lens.kind === 'zoom' && entry.focal_mm !== Math.round(explicit ? focalBase * TC_FACTOR : focalBase)) sharpestApprox = true
  }
  if (!sweet && lens.kind !== 'zoom') {
    const ss = parseApRange(lens.quick.sweet_spot)
    sweet = ss ? (tc ? shiftRange(ss, TC_FACTOR) : ss) : null
  }
  if (sweet) sweet = { lo: Math.max(sweet.lo, widest), hi: Math.min(Math.max(sweet.hi, sweet.lo), narrowest) }
  const tint = sweet && sweet.lo > widest ? { lo: widest, hi: sweet.lo } : null

  const closeUp = buildCloseUp(lens, body, sensor, focalBase, tc)
  const mags = lens.close_focus.max_mag
  const best = mags.slice().sort((a, b) => b.value - a.value)[0]
  const mfd = best ? (stepAt(lens.close_focus.mfd_m, best.focal_mm)?.value ?? null) : (stepAt(lens.close_focus.mfd_m, focalBase)?.value ?? null)

  const crop = cropFactor(sensor)
  const ticks = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45, 64].filter((t) => t > widest * 1.03 && t < narrowest * 0.97)

  const chips: string[] = []
  if (/MF only/i.test(lens.focus.on_z_body)) chips.push('MF only on FTZ II')
  else if (/manual/i.test(lens.focus.on_z_body)) chips.push('Manual focus')
  if (lens.focus.cpu === false) chips.push('No CPU — enter focal length in Non-CPU lens data')
  if (lens.stabilization.synchro_vr) chips.push('Synchro VR')
  else if (lens.stabilization.lens_vr) chips.push('Lens VR')
  if (sensor.dxCrop) chips.push('DX crop')
  if (lens.adapter) chips.push(`via ${lens.adapter}`)

  const thresholds = bandThresholds(bands)
  return {
    lens, body, sensor, tc, tcAvailable,
    focal: focalShown, focalBase, focalApprox: opt.approx && lens.kind === 'zoom',
    equivFocal: crop > 1.05 ? Math.round(focalShown * crop) : null,
    crop, widest, narrowest,
    strip: { lo: widest, hi: narrowest, sweet, tint, bands, segments: bandSegments(bands), thresholds, ticks },
    sharpest: sweet, sharpestApprox,
    sharpestNote: tc ? 'displayed' : lens.kind === 'zoom' ? `at ${Math.round(focalShown)} mm` : '',
    diffractionAt100: snapThird(bands.visible100),
    closest: {
      mag: best ? best.value * factor : 0,
      atFocal: best ? best.focal_mm : null,
      mfdM: mfd,
      est: tc || lens.kind === 'zoom',
    },
    closeUp,
    byFocalRow: entry
      ? { center: entry.center_peak ?? '—', corners: entry.corners_peak ?? '—', note: entry.wide_open_note ?? '', exact: !sharpestApprox }
      : null,
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
  const bands = diffractionBands(sensor)
  const setNs = [5.6, 8, 11]
  const rows = setNs.map((n) => {
    const setN = tc ? n : n
    const nEff = effectiveAperture(setN, mag, displaysEffective === true, pupil)
    const lvl = nEff >= bands.largeOutput ? 3 : nEff >= bands.visible100 ? 2 : nEff >= bands.measurable ? 1 : 0
    return { setN, nEff, dofPixelMm: mag ? dofMm(nEff, cPix, mag) : 0, dofOutMm: mag ? dofMm(nEff, cOut, mag) : 0, level: lvl }
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

/** Position 0–1 of an f-number on a strip, linear in stops (log N). */
export function stripPos(n: number, lo: number, hi: number): number {
  const p = Math.log(n / lo) / Math.log(hi / lo)
  return Math.min(1, Math.max(0, p))
}

export { THIRD_STOPS }
