import { useEffect, useRef } from 'preact/hooks'
import { go, set, useStore, type Tab } from './lib/state'
import { Mounted } from './screens/Mounted'
import { Lenses } from './screens/Lenses'
import { SettingsScreen } from './screens/Settings'
import { More } from './screens/More'
import { LensPicker } from './components/LensPicker'
import { SourcesSheet } from './components/SourcesSheet'

const TABS: { id: Tab; label: string; d: string }[] = [
  { id: 'mounted', label: 'Mounted', d: 'M4 12a8 8 0 1016 0 8 8 0 10-16 0M8.5 12a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0' },
  { id: 'lenses', label: 'Lenses', d: 'M4 6h16v3H4zM4 11h16v3H4zM4 16h16v3H4z' },
  { id: 'settings', label: 'Settings', d: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 7a2 2 0 104 0 2 2 0 10-4 0M8 17a2 2 0 104 0 2 2 0 10-4 0' },
  { id: 'more', label: 'More', d: 'M3.5 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M10.5 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M17.5 12a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0' },
]

export function App() {
  const st = useStore()
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => void scroller.current?.scrollTo(0, 0), [st.tab, st.sub?.type, (st.sub as any)?.id])

  // Long-press on the header area toggles Night (SPEC §5.7).
  useEffect(() => {
    let t: number | undefined
    const el = scroller.current
    if (!el) return
    const down = (e: PointerEvent) => {
      if (e.clientY > 90) return
      t = window.setTimeout(() => set({ theme: st.theme === 'night' ? 'light' : 'night' }), 700)
    }
    const up = () => window.clearTimeout(t)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointermove', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointermove', up) }
  }, [st.theme])

  return (
    <>
      <main class="scroll" ref={scroller}>
        {st.tab === 'mounted' && <Mounted />}
        {st.tab === 'lenses' && <Lenses />}
        {st.tab === 'settings' && <SettingsScreen />}
        {st.tab === 'more' && <More />}
      </main>
      <nav class="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} class="tab" aria-current={st.tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.d} /></svg>
            {t.label}
          </button>
        ))}
      </nav>
      {st.sheet === 'lens-picker' && <LensPicker />}
      {st.sheet === 'sources' && <SourcesSheet />}
    </>
  )
}
