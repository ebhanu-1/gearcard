import { useState } from 'preact/hooks'
import { lensGroups, lensById } from '../lib/data'
import { mount, set, useStore } from '../lib/state'
import type { Lens } from '../lib/types'
import { Sheet } from './Common'

export function lensBadges(l: Lens) {
  const b: string[] = []
  if (/MF/.test(l.focus.on_z_body)) b.push('MF')
  if (l.tc_compatible === true) b.push('TC')
  return b
}

export function LensRow({ l, onPick, sub }: { l: Lens; onPick: () => void; sub?: string }) {
  return (
    <button class="list-item" onClick={onPick}>
      <span class="t">
        <b>{l.short}{lensBadges(l).map((x) => <span key={x} class="mf">{x}</span>)}</b>
        <small>{sub ?? (l.quick.sweet_spot ? `Sweet spot ${l.quick.sweet_spot}` : l.quick.headline)}</small>
      </span>
    </button>
  )
}

export function LensPicker() {
  const st = useStore()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const match = (l: Lens) => !needle || `${l.name} ${l.short} ${l.id}`.toLowerCase().includes(needle)
  const recents = st.recents.map(lensById).filter((l): l is Lens => !!l && match(l))
  return (
    <Sheet title="Mount a lens" onClose={() => set({ sheet: null })}>
      <input class="search" type="search" placeholder="Search lenses" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search lenses" />
      {recents.length > 0 && !needle && (
        <section class="sec"><h2>Recent</h2>{recents.map((l) => <LensRow key={l.id} l={l} onPick={() => mount(l.id)} />)}</section>
      )}
      {lensGroups.map((g) => {
        const items = g.items.filter(match)
        return items.length ? (
          <section class="sec" key={g.id}><h2>{g.label}</h2>{items.map((l) => <LensRow key={l.id} l={l} onPick={() => mount(l.id)} />)}</section>
        ) : null
      })}
    </Sheet>
  )
}
