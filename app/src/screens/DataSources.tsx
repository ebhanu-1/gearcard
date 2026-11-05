import { bodies, curvesFor, dataWarnings, kit, lenses, settings } from '../lib/data'
import { back, mount } from '../lib/state'
import { BackBar } from '../components/Common'
import { APP_VERSION } from '../lib/update'

const KINDS = ['measured', 'review', 'video', 'manufacturer', 'forum'] as const

export function DataSources() {
  const counts: Record<string, number> = {}
  const add = (list?: { kind: string }[]) => list?.forEach((s) => (counts[s.kind] = (counts[s.kind] ?? 0) + 1))
  lenses.forEach((l) => add(l.sources))
  bodies.forEach((b) => add(b.sources))
  settings.forEach((s) => add(s.sources))
  const byConf = (c: string) => lenses.filter((l) => l.quick.confidence === c)
  const low = byConf('low')
  const medium = byConf('medium')
  const withNotes = lenses.filter((l) => l.research_notes?.trim())
  const warnings = dataWarnings()
  const curveEntries = lenses.flatMap((l) => {
    const r = curvesFor(l.id)
    return r?.ok ? r.data.entries : []
  })
  const inferredEntries = curveEntries.filter((e) => e.raw.confidence === 'inferred').length
  const newest = lenses.map((l) => { const r = curvesFor(l.id); return r?.ok ? r.data.lastUpdated : '' }).sort().pop()
  const noFrost = lenses.filter((l) => l.chris_frost.access !== 'transcript').length
  return (
    <>
      <BackBar label="More" onBack={back} />
      <h1>Data &amp; Sources</h1>
      <div class="card">
        <div class="kv">
          <span>Researched</span><span class="r">{kit.as_of}</span>
          <span>Lenses / bodies / settings</span><span class="r">{lenses.length} / {bodies.length} / {settings.length}</span>
          <span>App · data version</span><span class="r">{APP_VERSION} · {kit.as_of}</span>
        </div>
      </div>
      <section class="sec"><h2>Sharpness curves</h2>
        <div class="card">
          <div class="kv">
            <span>Curve entries</span><span class="r">{curveEntries.length}</span>
            <span>Inferred (drop-off or peak not measured)</span><span class="r">{inferredEntries}</span>
            <span>Latest update</span><span class="r">{newest || '—'}</span>
          </div>
          <p class="note">Peaks come from reviews, mostly on 45MP bodies like the Z8. On the Z5 II and at normal viewing sizes, the peak is in the same place but the drop past it is gentler.</p>
          <p class="note muted">Curves show shape, not measured values: reviews give verdicts and aperture ranges, not one sharpness scale. Edit data/lens-curves.json and redeploy to refine a lens.</p>
        </div>
      </section>
      <section class="sec"><h2>Sources by kind</h2>
        <div class="card"><div class="kv">{KINDS.map((k) => <><span>{k[0].toUpperCase() + k.slice(1)}</span><span class="r">{counts[k] ?? 0}</span></>)}</div></div>
      </section>
      <section class="sec"><h2>Lens confidence</h2>
        <div class="card"><div class="kv"><span>High</span><span class="r">{byConf('high').length}</span><span>Medium</span><span class="r">{medium.length}</span><span>Low</span><span class="r">{low.length}</span></div></div>
        {low.length === 0 && <p class="note">No lens is rated low confidence. {medium.length} are medium: one measured source, or measured sources that disagree modestly.</p>}
        {[...low, ...medium].map((l) => (
          <button key={l.id} class="list-item" onClick={() => mount(l.id)}><span class="t"><b>{l.short}</b><small>{l.quick.confidence}: {l.quick.confidence_reason}</small></span></button>
        ))}
      </section>
      <section class="sec"><h2>Chris Frost</h2><p class="note">A verdict from his videos was verified for {lenses.length - noFrost} of {lenses.length} lenses. Where he is mentioned the access level is stated on each lens’s evidence sheet.</p></section>
      <section class="sec"><h2>Known conflicts &amp; gaps</h2>
        {withNotes.map((l) => (
          <details key={l.id}><summary>{l.short}</summary><p class="note">{l.research_notes}</p></details>
        ))}
      </section>
      <section class="sec"><h2>Assumptions</h2><ul class="plain">{kit.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></section>
      {warnings.length > 0 && <section class="avoid"><h2>Data problems</h2><ul class="plain">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></section>}
    </>
  )
}
