import { push, set, back, useStore } from '../lib/state'
import { bodies } from '../lib/data'
import { BackBar, Chevron } from '../components/Common'
import { bodyShort } from '../components/LensCard'
import { BodyCard } from './BodyCard'
import { Search } from './Search'
import { DataSources } from './DataSources'
import { SettingDetail } from './SettingDetail'

export function More() {
  const st = useStore()
  const sub = st.sub
  if (sub?.type === 'body') return <BodyCard id={sub.id} />
  if (sub?.type === 'search') return <Search />
  if (sub?.type === 'sources') return <DataSources />
  if (sub?.type === 'setting') return <SettingDetail id={sub.id} />
  if (sub?.type === 'bodies') {
    return (
      <>
        <BackBar label="More" onBack={back} />
        <h1>Body cards</h1>
        {bodies.map((b) => (
          <button key={b.id} class="list-item" onClick={() => push({ type: 'body', id: b.id })}>
            <span class="t"><b>{bodyShort(b)}</b><small>{b.sensor.effective_mp} MP · {b.format} · {b.sensor.pixel_pitch_um} µm pitch</small></span><Chevron />
          </button>
        ))}
      </>
    )
  }
  return (
    <>
      <h1>More</h1>
      <button class="list-item" onClick={() => push({ type: 'bodies' })}><span class="t"><b>Body cards</b><small>Sensor facts, FTZ II behaviour, diffraction table</small></span><Chevron /></button>
      <button class="list-item" onClick={() => push({ type: 'search' })}><span class="t"><b>Search</b><small>Lenses, settings, options, gotchas</small></span><Chevron /></button>
      <button class="list-item" onClick={() => push({ type: 'sources' })}><span class="t"><b>Data &amp; Sources</b><small>What was researched, confidence, open conflicts</small></span><Chevron /></button>
      <div class="switch" style={{ borderTop: '1px solid var(--line)' }}>
        <span class="t" style={{ display: 'flex', flexDirection: 'column' }}>
          <b>Night mode (red)</b>
          <small class="muted" style={{ fontSize: 12 }}>Protects dark adaptation. Also: long-press the top of any screen.</small>
        </span>
        <button class={`chip ${st.theme === 'night' ? 'on' : ''}`} aria-pressed={st.theme === 'night'} onClick={() => set({ theme: st.theme === 'night' ? 'light' : 'night' })}>
          {st.theme === 'night' ? 'On' : 'Off'}
        </button>
      </div>
    </>
  )
}
