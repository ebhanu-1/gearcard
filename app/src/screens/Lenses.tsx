import { useState } from 'preact/hooks'
import { lensGroups } from '../lib/data'
import { mount } from '../lib/state'
import { LensRow } from '../components/LensPicker'

export function Lenses() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  return (
    <>
      <h1>Lenses</h1>
      <input class="search" type="search" placeholder="Search lenses" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search lenses" />
      {lensGroups.map((g) => {
        const items = g.items.filter((l) => !needle || `${l.name} ${l.short}`.toLowerCase().includes(needle))
        return items.length ? (
          <section class="sec" key={g.id}>
            <h2>{g.label}</h2>
            {items.map((l) => <LensRow key={l.id} l={l} onPick={() => mount(l.id)} />)}
          </section>
        ) : null
      })}
    </>
  )
}
