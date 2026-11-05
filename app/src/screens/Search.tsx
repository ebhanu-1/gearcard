import { useMemo, useState } from 'preact/hooks'
import { lenses, settings } from '../lib/data'
import { back, mount, push } from '../lib/state'
import { BackBar, Chevron } from '../components/Common'

export function Search() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  // Haystacks are built once; filtering 25 lenses + 81 settings is well inside the 50 ms budget.
  const index = useMemo(
    () => ({
      lenses: lenses.map((l) => ({ l, hay: `${l.name} ${l.short} ${l.quick.headline} ${l.quick.avoid.join(' ')} ${l.field_tips.join(' ')}`.toLowerCase() })),
      settings: settings.map((s) => ({
        s,
        hay: `${s.name} ${s.one_liner} ${s.options.map((o) => `${o.value} ${o.meaning}`).join(' ')} ${s.gotchas.join(' ')}`.toLowerCase(),
      })),
    }),
    [],
  )
  const lensHits = needle ? index.lenses.filter((x) => x.hay.includes(needle)).slice(0, 30) : []
  const setHits = needle ? index.settings.filter((x) => x.hay.includes(needle)).slice(0, 40) : []
  return (
    <>
      <BackBar label="More" onBack={back} />
      <h1>Search</h1>
      <input class="search" type="search" autofocus placeholder="Lenses, settings, options, gotchas" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search" />
      {needle && lensHits.length + setHits.length === 0 && <p class="note">Nothing found for “{q}”.</p>}
      {lensHits.length > 0 && (
        <section class="sec"><h2>Lenses</h2>
          {lensHits.map(({ l }) => (
            <button key={l.id} class="list-item" onClick={() => mount(l.id)}><span class="t"><b>{l.short}</b><small>{l.quick.headline}</small></span><Chevron /></button>
          ))}
        </section>
      )}
      {setHits.length > 0 && (
        <section class="sec"><h2>Settings</h2>
          {setHits.map(({ s }) => (
            <button key={s.id} class="list-item" onClick={() => push({ type: 'setting', id: s.id })}><span class="t"><b>{s.name}</b><small>{s.one_liner}</small></span><Chevron /></button>
          ))}
        </section>
      )}
    </>
  )
}
