import { bodies, bodyById, settingById } from '../lib/data'
import { back, push, useStore } from '../lib/state'
import { BackBar, Chevron, SourceItem } from '../components/Common'
import { bodyShort } from '../components/LensCard'

export function SettingDetail({ id }: { id: string }) {
  const st = useStore()
  const s = settingById(id)
  if (!s) return <><BackBar label="Back" onBack={back} /><p class="note">Setting not found.</p></>
  const body = bodyById(st.body)
  const here = s.menu_path[st.body]
  const others = bodies.filter((b) => b.id !== st.body && s.menu_path[b.id])
  const mine = st.scenario ? s.suggested.find((x) => x.scenario_id === st.scenario) : null
  const rest = s.suggested.filter((x) => x !== mine)
  const related = s.related.map(settingById).filter((x) => !!x)
  return (
    <>
      <BackBar label="Settings" onBack={back} />
      <div class="sec" style={{ gap: 4 }}>
        <span class="lbl">{s.group}</span>
        <h1>{s.name}</h1>
        <p class="verdict">{s.one_liner}</p>
      </div>
      {!s.available_on.includes(st.body) && <div class="chips"><span class="chip warn">Not available on the {bodyShort(body)}</span></div>}
      {mine && (
        <div class="callout">
          <span class="lbl">{mine.scenario}</span>
          <b class="mono">{mine.value}</b>
        </div>
      )}
      <div class="card">
        <span class="lbl">Menu path · {bodyShort(body)}</span>
        <b style={{ fontSize: 15, lineHeight: 1.35 }}>{here ?? 'Not available on this body'}</b>
        {others.length > 0 && (
          <details>
            <summary>Other bodies</summary>
            {others.map((b) => <p key={b.id} class="note"><b>{bodyShort(b)}:</b> {s.menu_path[b.id]}</p>)}
          </details>
        )}
      </div>
      <section class="sec"><h2>What it does</h2><p class="verdict">{s.what_it_does}</p></section>
      {s.when_to_change && <section class="sec"><h2>When to change it</h2><p class="verdict">{s.when_to_change}</p></section>}
      {s.options.length > 0 && (
        <section class="sec">
          <h2>Options</h2>
          {s.options.map((o, i) => (
            <div class="src" key={i}>
              <b style={{ fontSize: 15 }}>{o.value}</b>
              {o.meaning && <span class="note">{o.meaning}</span>}
              {o.use_when && <span class="note muted">Use when: {o.use_when}</span>}
            </div>
          ))}
        </section>
      )}
      {rest.length > 0 && (
        <section class="sec">
          <h2>Suggested by scenario</h2>
          <div class="card">
            {rest.map((x, i) => (
              <div key={i} class="kv"><span>{x.scenario}</span><span class="r" style={{ textAlign: 'right' }}>{x.value}</span></div>
            ))}
          </div>
        </section>
      )}
      {s.body_differences && <section class="sec"><h2>Body differences</h2><p class="note">{s.body_differences}</p></section>}
      {s.gotchas.length > 0 && (
        <section class="avoid"><h2>Gotchas</h2><ul class="plain">{s.gotchas.map((g, i) => <li key={i}>{g}</li>)}</ul></section>
      )}
      {s.firmware_note && <p class="note muted">Firmware: {s.firmware_note}</p>}
      {related.length > 0 && (
        <section class="sec">
          <h2>Related</h2>
          {related.map((r) => (
            <button key={r!.id} class="list-item" onClick={() => push({ type: 'setting', id: r!.id })}>
              <span class="t"><b>{r!.name}</b><small>{r!.one_liner}</small></span><Chevron />
            </button>
          ))}
        </section>
      )}
      <section class="sec">
        <h2>Sources</h2>
        {s.sources.map((x, i) => <SourceItem key={i} s={x} />)}
        {s.research_notes && <div class="callout"><b style={{ fontSize: 13 }}>Research notes</b><span class="note">{s.research_notes}</span></div>}
      </section>
    </>
  )
}
