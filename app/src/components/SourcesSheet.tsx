import { lensById } from '../lib/data'
import { set, useStore } from '../lib/state'
import { ConfBadge, Sheet, SourceItem, frostText } from './Common'

export function SourcesSheet() {
  const st = useStore()
  const lens = st.sourceTarget ? lensById(st.sourceTarget) : undefined
  if (!lens) return null
  const measured = lens.sources.filter((s) => s.kind === 'measured').length
  return (
    <Sheet title="Evidence" onClose={() => set({ sheet: null })}>
      <div class="card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ConfBadge c={lens.quick.confidence} /><b>{lens.short}</b></div>
        <p class="note">{lens.quick.confidence_reason}</p>
        <p class="note muted">{lens.sources.length} sources, {measured} measured.</p>
      </div>
      {lens.sources.map((s, i) => <SourceItem key={i} s={s} />)}
      <div class="src">
        <div class="h"><span class="kind">Video</span><b style={{ fontSize: 14 }}>Chris Frost</b></div>
        <div class="note"><b>{frostText(lens.chris_frost.access)}.</b></div>
        {lens.chris_frost.summary && <div class="note">{lens.chris_frost.summary}</div>}
        {lens.chris_frost.url && <a class="note" href={lens.chris_frost.url} target="_blank" rel="noopener noreferrer">Open video (needs a connection)</a>}
      </div>
      {lens.research_notes && (
        <div class="callout"><b style={{ fontSize: 13 }}>Research notes</b><span class="note">{lens.research_notes}</span></div>
      )}
    </Sheet>
  )
}
