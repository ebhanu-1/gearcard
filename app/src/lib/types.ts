export type BodyId = 'z8' | 'z5ii' | 'z50ii'
export type Confidence = 'high' | 'medium' | 'low'
export type SourceKind = 'measured' | 'review' | 'video' | 'manufacturer' | 'forum'

export interface Source {
  id?: string
  name: string
  url: string | null
  kind: SourceKind
  tested_on?: string | null
  date?: string | null
  findings?: string
}

export interface FocalValue { focal_mm: number; value: number }

export interface ByFocal {
  focal_mm: number
  center_peak: string | null
  corners_peak: string | null
  wide_open_note?: string
}

export interface Lens {
  id: string
  name: string
  short: string
  mount: 'Z' | 'F'
  adapter: string | null
  coverage: 'FX' | 'DX'
  kind: 'zoom' | 'prime' | 'macro'
  focal_mm: number[]
  max_aperture: { focal_mm: number; f: number }[]
  min_aperture_f: number
  aperture_blades?: number
  weight_g?: number
  filter_mm?: number | null
  focus: { on_z_body: string; cpu: boolean | null; motor?: string; notes?: string; focus_throw_deg?: number | null }
  stabilization: { lens_vr: boolean; lens_vr_stops: number | null; synchro_vr: boolean; ibis_on_ftz: string | null; notes?: string }
  close_focus: {
    mfd_m: FocalValue[]
    max_mag: FocalValue[]
    working_distance_mm_at_max_mag: number | null
    effective_aperture_at_max_mag: string | null
    camera_displays_effective: boolean | null
    pupil_magnification?: number | null
    notes?: string
  }
  quick: {
    headline: string
    sweet_spot: string | null
    wide_open: string
    by_focal: ByFocal[]
    close_up_best: string | null
    close_up_note: string
    diffraction_note: string | null
    avoid: string[]
    confidence: Confidence
    confidence_reason: string
  }
  character: Record<string, string>
  field_tips: string[]
  body_notes: { body: BodyId; note: string }[]
  tc_compatible: boolean | null
  sources: Source[]
  chris_frost: { url: string | null; access: string; summary: string }
  research_notes: string
}

export interface Body {
  id: BodyId
  name: string
  format: 'FX' | 'DX'
  sensor: {
    effective_mp: number; width_px: number; height_px: number; width_mm: number; height_mm: number
    pixel_pitch_um: number; type: string; olpf: boolean | null; readout_ms: number | null; readout_notes: string
  }
  iso: { base: number; native_range: string; extended: string; dual_gain_notes: string; ptp_notes: string }
  ibis: { cipa_stops: number | null; synchro_vr_stops: number | null; focus_point_vr: boolean | null; notes: string }
  shutter: { mechanical: boolean; efcs: boolean; electronic_fastest: string; flash_sync: string; slowest: string; notes: string }
  drive: { max_fps_raw: string; pre_release_capture: string; notes: string }
  af: { subject_detection: string[] | string; low_light_ev: string; notes: string }
  ftz_ii_behavior: string
  dx_crop: { mp: number | null; notes: string }
  special_features: { name: string; available: boolean; firmware?: string; notes?: string }[]
  video_key: { internal_raw: string; log: string; notes: string }
  firmware: { current: string; date: string; notable_changes: string }
  battery_media: string
  field_tips: string[]
  sources: Source[]
  research_notes: string
}

export interface Accessory {
  id: string
  name: string
  kind: string
  short?: string
  summary?: string
  effects?: unknown
  field_tips?: string[]
  sources?: Source[]
  research_notes?: string
  [k: string]: unknown
}

export interface Setting {
  id: string
  group: string
  name: string
  available_on: BodyId[]
  menu_path: Partial<Record<BodyId, string>>
  one_liner: string
  what_it_does: string
  options: { value: string; meaning: string; use_when: string }[]
  when_to_change: string
  suggested: { scenario: string; scenario_id: string; value: string }[]
  body_differences: string
  gotchas: string[]
  related: string[]
  firmware_note?: string
  research_notes?: string
  sources: Source[]
}

export interface Kit {
  as_of: string
  bodies: { id: BodyId; order: number; role: string }[]
  accessories: { id: string; role: string }[]
  lens_groups: { id: string; label: string; lenses: string[] }[]
  assumptions: string[]
  out_of_scope_v1: string[]
}
