import { useState } from 'preact/hooks'
import { SCENARIOS, bodyById, settingGroups, settings } from '../lib/data'
import { push, set, useStore } from '../lib/state'
import { Chevron } from '../components/Common'
import { bodyShort } from '../components/LensCard'
import { SettingDetail } from './SettingDetail'

export function SettingsScreen() {
  const st = useStore()
  const [q, setQ] = useState('')
  if (st.sub?.type === 'setting') return <SettingDetail id={st.sub.id} />
  const body = bodyById(st.body)
  const needle = q.trim().toLowerCase()
  const list = settings.filter(
    (s) =>
      (st.allBodies || s.available_on.includes(st.body)) &&
      (!st.scenario || s.suggested.some((x) => x.scenario_id === st.scenario)) &&
      (!needle || `${s.name} ${s.one_liner}`.toLowerCase().includes(needle)),
  )
  const scenarioLabel = SCENARIOS.find((s) => s.id === st.scenario)?.label
  return (
    <>
      <h1>Settings</h1>
      <input class="search" type="search" placeholder="Search settings" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search settings" />
      <div class="chips" role="group" aria-label="Scenario">
        {SCENARIOS.map((s) => (
          <button key={s.id} class={`chip ${st.scenario === s.id ? 'on' : ''}`} aria-pressed={st.scenario === s.id} onClick={() => set({ scenario: st.scenario === s.id ? null : s.id })}>
            {s.label}
          </button>
        ))}
      </div>
      <div class="switch">
        <span class="note">{st.allBodies ? 'Showing all bodies' : `Showing ${bodyShort(body)} only`}</span>
        <button class="chip" onClick={() => set({ allBodies: !st.allBodies })}>{st.allBodies ? `Only ${bodyShort(body)}` : 'Show all bodies'}</button>
      </div>
      {list.length === 0 && (
        <p class="note">
          {st.scenario === 'video'
            ? 'No suggested values were researched for the Video scenario. Browse the Video & Controls group with the chip off.'
            : 'Nothing matches.'}
        </p>
      )}
      {settingGroups.map((g) => {
        const items = list.filter((s) => s.group === g)
        if (!items.length) return null
        return (
          <section class="sec" key={g}>
            <h2>{g}</h2>
            {items.map((s) => {
              const sug = st.scenario ? s.suggested.find((x) => x.scenario_id === st.scenario) : null
              return (
                <button key={s.id} class="list-item" onClick={() => push({ type: 'setting', id: s.id })}>
                  <span class="t">
                    <b>{s.name}</b>
                    <small>{sug ? <><span class="mono" style={{ color: 'var(--accent-ink)' }}>{sug.value}</span> · {scenarioLabel}</> : s.one_liner}</small>
                  </span>
                  <Chevron />
                </button>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
