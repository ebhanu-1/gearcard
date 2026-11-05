// Derived optics (SPEC §6). Pure functions, no I/O. λ = 0.55 µm.
// v1.5: the per-body diffraction bands were removed; sharpness vs aperture now comes from per-lens curves (curves.ts).

export const LAMBDA_UM = 0.55
export const DX_W_MM = 23.5
export const DX_H_MM = 15.7
export const TC_FACTOR = 1.4

/** Third-stop scale (SPEC §6.7), extended past f/32 so a TC-1.4x on an f/32 lens still plots. */
export const THIRD_STOPS = [
  1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29,
  32, 36, 40, 45, 51, 57, 64,
]

export interface Sensor {
  /** Imaged area: the full sensor, or the DX crop window on an FX body. */
  widthMm: number
  heightMm: number
  /** Pixel pitch of the native sensor in µm; unchanged by a DX crop. */
  pitchUm: number
  /** True when an FX body is cropped to DX for a DX lens. */
  dxCrop: boolean
}

export const diagonal = (w: number, h: number) => Math.hypot(w, h)
export const pixelPitchUm = (widthMm: number, widthPx: number) => (widthMm / widthPx) * 1000
export const airyDiameterUm = (n: number) => 2.44 * LAMBDA_UM * n
export const outputCoC_um = (s: Sensor) => (diagonal(s.widthMm, s.heightMm) / 3000) * 1000
export const pixelCoC_um = (s: Sensor) => 2 * s.pitchUm

/** Nearest third-stop in log space. */
export function snapThird(n: number): number {
  let best = THIRD_STOPS[0]
  let bd = Infinity
  for (const t of THIRD_STOPS) {
    const d = Math.abs(Math.log(t / n))
    if (d < bd) {
      bd = d
      best = t
    }
  }
  return best
}

/** Distance between two f-numbers in third stops (signed). */
export const thirdsBetween = (a: number, b: number) => 6 * Math.log2(b / a)

/** SPEC §6.3. displaysEffective = camera already shows N_eff, so do not multiply again. */
export function effectiveAperture(setN: number, m: number, displaysEffective: boolean, pupilMag = 1): number {
  return displaysEffective ? setN : setN * (1 + m / pupilMag)
}

/** SPEC §6.4. Total DOF in mm from the effective f-number. */
export function dofMm(nEff: number, cocUm: number, m: number): number {
  return (2 * nEff * (cocUm / 1000)) / (m * m)
}

/** SPEC §6.5 */
export function frameMm(s: Sensor, m: number) {
  return { w: s.widthMm / m, h: s.heightMm / m }
}

/** SPEC §6.6 */
export const cropFactor = (s: Sensor) => 43.27 / diagonal(s.widthMm, s.heightMm)

/** SPEC §6.2 */
export function withTeleconverter(v: { focal: number; n: number; mag: number }) {
  return { focal: v.focal * TC_FACTOR, n: v.n * TC_FACTOR, mag: v.mag * TC_FACTOR }
}

// ---------------------------------------------------------------------------
// Parsing researched aperture text ("f/5.6–f/8", "f/9–f/11 (displayed, with TC-1.4x)")
// ---------------------------------------------------------------------------

export interface ApRange {
  lo: number
  hi: number
}

const LEADING = /^\s*f\/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(?:f\/)?(\d+(?:\.\d+)?))?/i

/** Leading f-number or range from free text. Null when the text does not start with one. */
export function parseApRange(text: string | null | undefined): ApRange | null {
  if (!text) return null
  const m = LEADING.exec(text)
  if (!m) return null
  const a = parseFloat(m[1])
  const b = m[2] ? parseFloat(m[2]) : a
  return { lo: Math.min(a, b), hi: Math.max(a, b) }
}

export function shiftRange(r: ApRange, factor: number): ApRange {
  return { lo: snapThird(r.lo * factor), hi: snapThird(r.hi * factor) }
}

export function fmtN(n: number): string {
  const v = Math.round(n * 10) / 10
  return Number.isInteger(v) ? `${v}` : v.toFixed(1)
}
export const fmtF = (n: number) => `f/${fmtN(n)}`
export function fmtRange(r: ApRange, withF = true): string {
  return r.lo === r.hi ? (withF ? fmtF(r.lo) : fmtN(r.lo)) : `${withF ? fmtF(r.lo) : fmtN(r.lo)}–${fmtN(r.hi)}`
}
export function fmtMag(m: number): string {
  const ratio = m >= 1 ? `${fmtN(m)}:1` : `1:${fmtN(1 / m)}`
  return `${ratio} · ${m.toFixed(2)}×`
}
export function fmtMm(mm: number): string {
  if (mm >= 100) return `${Math.round(mm)} mm`
  if (mm >= 10) return `${Math.round(mm)} mm`
  return `${mm.toFixed(2)} mm`
}
/** DOF text: mm below 10, cm above (matches docs/reference-tables.md). */
export function fmtDof(mm: number): string {
  return mm >= 10 ? `${(mm / 10).toFixed(1)} cm` : `${mm.toFixed(2)} mm`
}
