// Loads, indexes and sanity-checks the researched JSON (bundled at build time, SPEC §3).
import type { Accessory, Body, BodyId, Kit, Lens, Setting } from './types'

const files = import.meta.glob('../../../data/**/*.json', { eager: true, import: 'default' }) as Record<string, unknown>

const pick = <T>(dir: string): T[] =>
  Object.entries(files)
    .filter(([p]) => p.includes(`/data/${dir}/`))
    .map(([, v]) => v as T)

export const kit = files['../../../data/kit.json'] as Kit
export const bodies: Body[] = kit.bodies
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((b) => pick<Body>('bodies').find((x) => x.id === b.id))
  .filter((b): b is Body => !!b)
export const bodyById = (id: BodyId): Body => bodies.find((b) => b.id === id) ?? bodies[0]

const lensMap = new Map(pick<Lens>('lenses').map((l) => [l.id, l]))
export const lensById = (id: string): Lens | undefined => lensMap.get(id)

export const lensGroups = kit.lens_groups.map((g) => ({
  ...g,
  items: g.lenses.map((id) => lensMap.get(id)).filter((l): l is Lens => !!l),
}))
export const lenses: Lens[] = lensGroups.flatMap((g) => g.items)
export const groupOf = (lensId: string) => lensGroups.find((g) => g.lenses.includes(lensId))

export const accessories = pick<Accessory>('accessories')
export const accessoryById = (id: string) => accessories.find((a) => a.id === id)

export const settings: Setting[] = pick<Setting[]>('settings').flat()
export const settingById = (id: string) => settings.find((s) => s.id === id)
export const settingGroups = Array.from(new Set(settings.map((x) => x.group)))
export const SCENARIOS: { id: string; label: string }[] = [
  { id: 'birds', label: 'Birds' }, { id: 'dance', label: 'Stage dance' }, { id: 'kids', label: 'Kids' },
  { id: 'landscape', label: 'Landscape (tripod)' }, { id: 'macro', label: 'Macro' }, { id: 'moonrise', label: 'Moonrise/astro' },
  { id: 'video', label: 'Video' },
]

/** Problems found at startup; shown in Data & Sources instead of being hidden (CLAUDE.md ground rules). */
export function dataWarnings(): string[] {
  const w: string[] = []
  for (const id of kit.lens_groups.flatMap((g) => g.lenses)) if (!lensMap.has(id)) w.push(`kit.json lists ${id} but no lens file exists`)
  for (const l of lensMap.values()) if (!kit.lens_groups.some((g) => g.lenses.includes(l.id))) w.push(`${l.id} has a file but is not in kit.json`)
  for (const b of kit.bodies) if (!bodies.some((x) => x.id === b.id)) w.push(`kit.json lists body ${b.id} but no body file exists`)
  return w
}
