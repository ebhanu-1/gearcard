import { useMemo } from 'preact/hooks'
import { buildLensCard, focalOptions } from '../lib/lensView'
import { BAND_NAMES, fmtDof, fmtF, fmtMag, fmtMm, fmtN, fmtRange } from '../lib/optics'
import type { Body, Lens } from '../lib/types'
import { ApertureStrip } from './Strip'
import { Chevron, ConfBadge } from './Common'
import { get, set, setFocal, useStore } from '../lib/state'

export const bodyShort = (b: Body) => b.name.replace(/^Nikon /, '').replace('Z5II', 'Z5 II').replace('Z50II', 'Z50 II')

const CHARACTER_ROWS: [string, string][] = [
  ['bokeh', 'Bokeh'], ['flare_sunstar', 'Flare / sunstar'], ['ca', 'CA'], ['distortion', 'Distortion'],
  ['vignetting', 'Vignetting'], ['coma_astro', 'Coma (astro)'], ['focus_breathing', 'Focus breathing'], ['other', 'Other'],
]

export function LensCard({ lens, body }: { lens: Lens; body: Body }) {
  const st = useStore()
  const tcOn = st.tc && lens.tc_compatible === true
  const opts = focalOptions(lens, tcOn)
  const stored = st.focalByLens[lens.id]
  const wantedShown = stored != null ? Math.round(stored * (tcOn ? 1.4 : 1)) : null
  const m = useMemo(() => buildLensCard(lens, body, wantedShown, st.tc), [lens, body, wantedShown, st.tc])
  const q = lens.quick
  const bShort = bodyShort(body)
  const cu = m.closeUp
  const shiftFocus = body.special_features.find((f) => /focus shift/i.test(f.name) && f.available)
  const bodyNotes = lens.body_notes.filter((n) => n.body === body.id)
  const charRows = CHARACTER_ROWS.filter(([k]) => lens.character?.[k]?.trim())
  const openSources = () => set({ sheet: 'sources', sourceTarget: lens.id })
  const top3 = lens.sources.slice(0, 3).map((s) => s.name.replace(/ review$/i, '')).join(', ')

  return (
    <>
      <div class="chips">
        {m.tcAvailable && (
          <button class={`chip ${m.tc ? 'on' : ''}`} aria-pressed={m.tc} onClick={() => set({ tc: !get().tc })}>
            {m.tc
              ? `TC-1.4x on · ${Math.round(lens.focal_mm[0] * 1.4)}${lens.focal_mm[1] ? `–${Math.round(lens.focal_mm[1] * 1.4)}` : ''} mm`
              : 'TC-1.4x off'}
          </button>
        )}
        {m.chips.map((c) => (
          <span key={c} class={`chip ${/MF only|No CPU/.test(c) ? 'warn' : ''}`}>{c}</span>
        ))}
        {m.equivFocal && <span class="chip">≈ {m.equivFocal} mm equivalent</span>}
      </div>

      {lens.kind === 'zoom' && opts.length > 1 && (
        <div class="sec" style={{ gap: 6 }}>
          <span class="lbl">Focal length{m.tc ? ' (with TC)' : ''}</span>
          <div class="steps" role="group" aria-label="Focal length">
            {opts.map((o) => (
              <button key={o.base} aria-pressed={Math.abs(o.shown - m.focal) < 1} onClick={() => setFocal(lens.id, o.base)}>
                {o.approx && m.tc ? '≈' : ''}{o.shown}
              </button>
            ))}
          </div>
          {m.focalApprox && <span class="note muted">No test at this focal length with the converter: bare-lens result shifted one stop (extrapolated).</span>}
        </div>
      )}

      <div class="hero">
        <div class="tile">
          <span class="k">Sharpest</span>
          <span class="v good">{m.sharpest ? `${m.sharpestApprox ? '≈' : ''}${fmtRange(m.sharpest)}` : '—'}</span>
          <span class="s">{m.sharpest ? m.sharpestNote || 'set on camera' : 'not researched'}</span>
        </div>
        <div class="tile">
          <span class="k">Diffraction</span>
          <span class="v b2">{fmtF(m.diffractionAt100)}</span>
          <span class="s">visible at 100% on {bShort}{m.sensor.dxCrop ? ' (DX crop)' : ''}</span>
        </div>
        <div class="tile">
          <span class="k">Closest</span>
          <span class="v">{m.closest.mag ? `${m.closest.mag.toFixed(2)}×` : '—'}</span>
          <span class="s">{m.closest.mfdM != null ? `${m.closest.mfdM} m${m.closest.est ? ' (est.)' : ''}` : 'MFD unknown'}</span>
        </div>
      </div>

      <ApertureStrip strip={m.strip} bodyLabel={bShort} />

      <p class="verdict">{q.headline}</p>
      {q.diffraction_note && (
        <p class="note"><b>Measured on this lens:</b> {q.diffraction_note}</p>
      )}
      <details>
        <summary>How to read the bands</summary>
        <p class="note">
          Pixel pitch decides when you can <i>see</i> diffraction at 100%; sensor format decides when it shows in the final image.
          A Z5 II and a Z8 print the same at f/11; the Z8 just shows it earlier at 100%.
          {m.strip.thresholds.length < 3 ? ' Two boundaries sit within a third of a stop here, so they are drawn as one.' : ''}
          {' '}Thresholds on {bShort}{m.sensor.dxCrop ? ' (DX crop)' : ''}: {m.strip.thresholds.map((t) => `${t.label.toLowerCase()} from f/${fmtN(t.n)}`).join(', ')}.
        </p>
      </details>
      <details>
        <summary>Wide open</summary>
        <p class="note">{q.wide_open}</p>
        {m.byFocalRow?.note && <p class="note muted">{m.byFocalRow.note}</p>}
      </details>

      <button class="link-row" onClick={openSources}>
        <span><ConfBadge c={q.confidence} />{top3 || 'No sources'}</span>
        <Chevron />
      </button>

      <section class="sec">
        <h2>Close-up</h2>
        <div class="card">
          <div class="kv">
            <span>Minimum focus (from focal plane)</span>
            <span class="r">{cu.mfdM != null ? `${cu.mfdM} m` : 'unknown'}</span>
            <span>Maximum magnification{lens.kind === 'zoom' && cu.magFocal ? ` at ${cu.magFocal} mm` : ''}</span>
            <span class="r">{cu.mag ? fmtMag(cu.mag) : 'unknown'}</span>
            {m.tc && cu.mag > 0 && <><span>With TC-1.4x</span><span class="r">same MFD, ×1.4</span></>}
            {cu.mag > 0 && (
              <>
                <span>Smallest subject that fills the frame</span>
                <span class="r">{fmtMm(cu.frameW)} × {fmtMm(cu.frameH)}</span>
              </>
            )}
            {cu.workingDistanceMm != null && <><span>Working distance at max mag</span><span class="r">{cu.workingDistanceMm} mm</span></>}
          </div>
          {cu.mag > 0 && (
            <p class="note">
              {cu.displaysEffective === true
                ? `Camera shows the effective aperture${lens.close_focus.effective_aperture_at_max_mag ? `: ${lens.close_focus.effective_aperture_at_max_mag.replace(/[.\s]+$/, '')}.` : '.'} The f-number you read already includes the close-focus loss, so nothing is multiplied again.`
                : `You set the nominal f-number; at ${fmtMag(cu.mag)} you are really at ≈ ${fmtF(cu.rows[1].nEff)} when you set ${fmtF(cu.rows[1].setN)} (approx., pupil magnification ${fmtN(cu.pupil)}).${cu.displaysEffective === null ? ' Whether the camera shows this is unverified for this lens.' : ''}`}
            </p>
          )}
          {q.close_up_best && (
            <p class="note"><b>Best close-up aperture:</b> <span class="mono">{q.close_up_best}</span>{q.close_up_note ? ` — ${q.close_up_note}` : ''}</p>
          )}
        </div>
        {cu.mag >= 0.1 ? (
          <div class="card">
            <table class="t">
              <thead>
                <tr><th>{cu.displaysEffective === true ? 'Shown' : 'Set'}</th><th>Effective</th><th>DOF at 100%</th><th>DOF in print</th></tr>
              </thead>
              <tbody>
                {cu.rows.map((r) => (
                  <tr key={r.setN}>
                    <td>{fmtF(r.setN)}</td>
                    <td>{fmtF(r.nEff)}{r.level ? ` · ${BAND_NAMES[r.level as 1 | 2 | 3].split(' ')[0].toLowerCase()}` : ''}</td>
                    <td>{fmtDof(r.dofPixelMm)}</td>
                    <td>{fmtDof(r.dofOutMm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p class="note muted">DOF at max magnification on {bShort}, using c = 2× pixel pitch ({cu.cocPixelUm.toFixed(1)} µm) and a print circle of {cu.cocOutUm.toFixed(1)} µm.{shiftFocus ? ' For more depth, use Focus shift shooting.' : ''}</p>
          </div>
        ) : (
          cu.mag > 0 && <p class="note muted">DOF table hidden: the close-up formula is only valid from about 0.1× up.</p>
        )}
      </section>

      {q.avoid.length > 0 && (
        <section class="avoid">
          <h2>Avoid</h2>
          <ul class="plain">{q.avoid.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>
      )}

      {charRows.length > 0 && (
        <section class="sec">
          <h2>Character</h2>
          <div class="card" style={{ gap: 10 }}>
            {charRows.map(([k, label]) => (
              <div key={k}>
                <b style={{ fontSize: 13 }}>{label}</b>
                <p class="note">{lens.character[k]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(lens.field_tips.length > 0 || bodyNotes.length > 0) && (
        <section class="sec">
          <h2>Field tips</h2>
          <ul class="plain">
            {lens.field_tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          {bodyNotes.map((n, i) => (
            <div key={i} class="callout">
              <b style={{ fontSize: 13 }}>On the {bShort}</b>
              <span class="note">{n.note}</span>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
