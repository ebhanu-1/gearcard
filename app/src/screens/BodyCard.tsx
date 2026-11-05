import { bodyById } from '../lib/data'
import { back } from '../lib/state'
import type { BodyId } from '../lib/types'
import { BackBar, SourceItem } from '../components/Common'

const list = (v: string[] | string | undefined) => (Array.isArray(v) ? v.join(', ') : v ?? '')

export function BodyCard({ id }: { id: BodyId }) {
  const b = bodyById(id)
  const s = b.sensor
  const pitch = (s.width_mm / s.width_px) * 1000
  const ready = (v: string | null | undefined) => (v && v.trim() ? v : 'not researched')
  return (
    <>
      <BackBar label="Back" onBack={back} />
      <h1>{b.name}</h1>
      <section class="sec">
        <h2>Sensor</h2>
        <div class="card"><div class="kv">
          <span>Resolution</span><span class="r">{s.effective_mp} MP</span>
          <span>Pixel pitch</span><span class="r">{pitch.toFixed(2)} µm</span>
          <span>Size</span><span class="r">{s.width_mm} × {s.height_mm} mm</span>
          <span>Type</span><span class="r">{s.type}</span>
          <span>OLPF</span><span class="r">{s.olpf == null ? 'unknown' : s.olpf ? 'yes' : 'no'}</span>
          <span>Readout (stills e-shutter)</span><span class="r">{s.readout_ms != null ? `${s.readout_ms} ms` : 'unknown'}</span>
        </div>{s.readout_notes && <details><summary>Readout notes</summary><p class="note">{s.readout_notes}</p></details>}</div>
      </section>

      <section class="sec">
        <h2>ISO &amp; stabilisation</h2>
        <div class="card"><div class="kv">
          <span>Native ISO</span><span class="r">{b.iso.native_range}</span>
          <span>Base / extended</span><span class="r">{b.iso.base} / {b.iso.extended}</span>
          <span>IBIS</span><span class="r">{b.ibis.cipa_stops != null ? `${b.ibis.cipa_stops} stops` : 'none'}</span>
          <span>With Synchro VR</span><span class="r">{b.ibis.synchro_vr_stops != null ? `${b.ibis.synchro_vr_stops} stops` : 'n/a'}</span>
          <span>Focus-point VR</span><span class="r">{b.ibis.focus_point_vr == null ? 'unknown' : b.ibis.focus_point_vr ? 'yes' : 'no'}</span>
        </div>
          {b.iso.dual_gain_notes && <p class="note">{b.iso.dual_gain_notes}</p>}
          {b.ibis.notes && <p class="note muted">{b.ibis.notes}</p>}</div>
      </section>

      <section class="sec">
        <h2>Shutter, drive &amp; AF</h2>
        <div class="card"><div class="kv">
          <span>Mechanical shutter</span><span class="r">{b.shutter.mechanical ? 'yes' : 'no'}</span>
          <span>EFCS</span><span class="r">{b.shutter.efcs ? 'yes' : 'no'}</span>
          <span>Fastest electronic</span><span class="r">{b.shutter.electronic_fastest}</span>
          <span>Flash sync</span><span class="r" style={{ fontFamily: 'var(--sans)' }}>{ready(b.shutter.flash_sync).split('.')[0]}</span>
          <span>Max RAW fps</span><span class="r">{ready(b.drive.max_fps_raw)}</span>
          <span>Low-light AF</span><span class="r">{ready(b.af.low_light_ev)}</span>
        </div>
          <p class="note"><b>Pre-release capture:</b> {ready(b.drive.pre_release_capture)}</p>
          <p class="note"><b>Subject detection:</b> {ready(list(b.af.subject_detection))}</p>
          {b.shutter.notes && <details><summary>Shutter notes</summary><p class="note">{b.shutter.notes}</p></details>}
        </div>
      </section>

      <section class="sec">
        <h2>FTZ II &amp; DX crop</h2>
        <div class="card"><p class="note">{b.ftz_ii_behavior}</p><p class="note"><b>DX crop{b.dx_crop.mp ? ` (${b.dx_crop.mp} MP)` : ''}:</b> {b.dx_crop.notes}</p></div>
      </section>

      <section class="sec">
        <h2>Special features</h2>
        <div class="card">
          {b.special_features.map((f, i) => (
            <div key={i} class="kv" style={{ alignItems: 'start' }}>
              <span><b>{f.name}</b>{f.notes ? <span class="note muted"> — {f.notes}</span> : null}</span>
              <span class="r" style={{ fontFamily: 'var(--sans)' }}>{f.available ? `yes${f.firmware ? ` · ${f.firmware}` : ''}` : 'no'}</span>
            </div>
          ))}
        </div>
      </section>

      <section class="sec">
        <h2>Firmware</h2>
        <div class="card"><p class="note"><b>{ready(b.firmware.current)}</b>{b.firmware.date ? ` · ${b.firmware.date}` : ''}</p>{b.firmware.notable_changes && <p class="note">{b.firmware.notable_changes}</p>}</div>
      </section>

      {b.field_tips.length > 0 && <section class="sec"><h2>Field tips</h2><ul class="plain">{b.field_tips.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
      <section class="sec">
        <h2>Sources</h2>
        {b.sources.map((x, i) => <SourceItem key={i} s={x} />)}
        {b.research_notes && <div class="callout"><b style={{ fontSize: 13 }}>Research notes</b><span class="note">{b.research_notes}</span></div>}
      </section>
    </>
  )
}
