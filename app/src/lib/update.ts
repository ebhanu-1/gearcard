// Versioning, self-update and offline launch. Same protocol as ClearSky and Studio Phone:
//  - the page carries its version in <meta name="app-version">; every release build bumps the VERSION file
//  - the app probes the live page (?u=<time>, always network) at launch and whenever it returns to the foreground
//  - if the live version differs: at launch it reloads to it (?v=<version>, fetched fresh by the service worker);
//    later it shows an "Update now" banner so a view in progress is not yanked away
//  - public/sw.js serves the cached page first so the Home Screen app opens with no network
import { useEffect, useState } from 'preact/hooks'

export const APP_VERSION: string = __APP_VERSION__

interface UpdateState { live: string | null; note: string | null }
let state: UpdateState = { live: null, note: null }
const listeners = new Set<() => void>()
const emit = (patch: Partial<UpdateState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
export function useUpdate(): UpdateState {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  return state
}

const mine = () => (APP_VERSION.match(/^v([\d.]+)$/) || [])[1]
export function applyUpdate(live: string) {
  location.replace(location.pathname + '?v=' + live + location.hash)
}

export async function checkForUpdate(auto: boolean, manual = false) {
  const say = (t: string) => { emit({ note: t }); setTimeout(() => emit({ note: null }), 3500) }
  try {
    if (!/^https?:$/.test(location.protocol)) return
    const r = await fetch(location.pathname + '?u=' + Date.now(), { cache: 'no-store' })
    if (!r.ok) return
    const m = (await r.text()).match(/name="app-version" content="v([\d.]+)"/)
    if (!m) return
    const live = m[1]
    if (live === mine()) {
      emit({ live: null })
      if (manual) say(`You have the latest version (v${live}).`)
      return
    }
    if (auto) { applyUpdate(live); return }
    emit({ live })
  } catch {
    if (manual) say('Could not check. Are you online?')
  }
}

export function registerSW() {
  try {
    if (!('serviceWorker' in navigator)) return
    if (!(location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) return
    navigator.serviceWorker.register('sw.js?p=' + encodeURIComponent(location.pathname), { scope: location.pathname }).catch(() => {})
  } catch {
    /* offline launch is optional */
  }
}

/** Production only: the dev server must not cache pages or reload itself. */
export function startUpdateLoop() {
  if (!import.meta.env.PROD) return
  registerSW()
  setTimeout(() => checkForUpdate(true), 1500)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate(false)
  })
}
