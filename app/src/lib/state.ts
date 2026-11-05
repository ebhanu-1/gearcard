// App state: one small store, persisted to localStorage. Every storage access is guarded (SPEC §3).
import { useEffect, useState } from 'preact/hooks'
import type { BodyId } from './types'

export type Tab = 'mounted' | 'lenses' | 'settings' | 'more'
export type Sub =
  | { type: 'setting'; id: string }
  | { type: 'body'; id: BodyId }
  | { type: 'bodies' }
  | { type: 'search' }
  | { type: 'sources' }
  | null

export interface State {
  body: BodyId
  lens: string
  recents: string[]
  focalByLens: Record<string, number>
  tc: boolean
  theme: 'light' | 'night'
  scenario: string | null
  allBodies: boolean
  tab: Tab
  sub: Sub
  subStack: Sub[]
  sheet: 'lens-picker' | 'sources' | null
  sourceTarget: string | null
}

const KEY = 'gearcard.v1'
const PERSISTED: (keyof State)[] = ['body', 'lens', 'recents', 'focalByLens', 'tc', 'theme', 'scenario', 'allBodies']

const defaults: State = {
  body: 'z8', lens: 'z-70-200-f28-vr-s', recents: [], focalByLens: {}, tc: false, theme: 'light',
  scenario: null, allBodies: false, tab: 'mounted', sub: null, subStack: [], sheet: null, sourceTarget: null,
}

export function load(): Partial<State> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<State>) : {}
  } catch {
    return {}
  }
}
function save(s: State) {
  try {
    const out: Record<string, unknown> = {}
    for (const k of PERSISTED) out[k] = s[k]
    localStorage.setItem(KEY, JSON.stringify(out))
  } catch {
    /* storage unavailable: the app keeps working in memory */
  }
}

let state: State = { ...defaults, ...load() }
const listeners = new Set<() => void>()

export const get = () => state
export function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  save(state)
  applyTheme()
  listeners.forEach((l) => l())
}
export function useStore(): State {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  return state
}

export function applyTheme() {
  const root = document.documentElement
  if (state.theme === 'night') root.setAttribute('data-theme', 'night')
  else root.removeAttribute('data-theme')
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', state.theme === 'night' ? '#000000' : '#FBFAF7')
}

/** Validate persisted ids against the loaded data so stale storage cannot break the app. */
export function sanitize(validLens: (id: string) => boolean, validBody: (id: string) => boolean) {
  const patch: Partial<State> = {}
  if (!validBody(state.body)) patch.body = defaults.body
  if (!validLens(state.lens)) patch.lens = defaults.lens
  patch.recents = (state.recents ?? []).filter(validLens).slice(0, 5)
  if (Object.keys(patch).length) {
    state = { ...state, ...patch }
  }
}

export function mount(lensId: string) {
  const recents = [lensId, ...get().recents.filter((r) => r !== lensId)].slice(0, 5)
  set({ lens: lensId, recents, tab: 'mounted', sub: null, subStack: [], sheet: null })
}
export function go(tab: Tab) {
  set({ tab, sub: null, subStack: [] })
}
export function push(sub: Sub) {
  const s = get()
  set({ sub, subStack: s.sub ? [...s.subStack, s.sub] : s.subStack })
}
export function back() {
  const s = get()
  const stack = s.subStack.slice()
  const prev = stack.pop() ?? null
  set({ sub: prev, subStack: stack })
}
export function setFocal(lensId: string, mm: number) {
  set({ focalByLens: { ...get().focalByLens, [lensId]: mm } })
}
