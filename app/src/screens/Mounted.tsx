import { bodies, bodyById, lensById } from '../lib/data'
import { set, useStore } from '../lib/state'
import { Chevron } from '../components/Common'
import { LensCard, bodyShort } from '../components/LensCard'

export function Mounted() {
  const st = useStore()
  const body = bodyById(st.body)
  const lens = lensById(st.lens)!
  return (
    <>
      <div class="seg" role="group" aria-label="Body">
        {bodies.map((b) => (
          <button key={b.id} aria-pressed={b.id === st.body} onClick={() => set({ body: b.id })}>{bodyShort(b)}</button>
        ))}
      </div>
      <button class="row-btn" onClick={() => set({ sheet: 'lens-picker' })}>
        <span class="l"><small>Mounted lens</small><b>{lens.short}</b></span>
        <Chevron dir="down" size={18} />
      </button>
      <LensCard key={lens.id + body.id} lens={lens} body={body} />
    </>
  )
}
