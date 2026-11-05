import type { ComponentChildren } from 'preact'
import type { Confidence, Source } from '../lib/types'

export const Chevron = ({ dir = 'right', size = 16 }: { dir?: 'right' | 'down' | 'left'; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" class="ico" style={{ width: size, height: size, color: 'var(--muted)' }} aria-hidden="true">
    <path d={dir === 'right' ? 'M9 6l6 6-6 6' : dir === 'left' ? 'M15 6l-6 6 6 6' : 'M6 9l6 6 6-6'} />
  </svg>
)

export const ConfBadge = ({ c }: { c: Confidence }) => <span class={`badge ${c}`}>{c === 'high' ? 'High' : c === 'medium' ? 'Medium' : 'Low'}</span>

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  return (
    <>
      <div class="sheet-back" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <button class="x" onClick={onClose}>Done</button>
        </header>
        <div class="body">{children}</div>
      </div>
    </>
  )
}

export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button class="back" onClick={onBack}>
      <Chevron dir="left" size={18} />
      {label}
    </button>
  )
}

const KIND_LABEL: Record<string, string> = { measured: 'Measured', review: 'Review', video: 'Video', manufacturer: 'Manufacturer', forum: 'Forum' }
export function SourceItem({ s }: { s: Source }) {
  return (
    <div class="src">
      <div class="h">
        <span class={`kind ${s.kind}`}>{KIND_LABEL[s.kind] ?? s.kind}</span>
        <b style={{ fontSize: 14 }}>{s.name}</b>
      </div>
      {(s.tested_on || s.date) && (
        <div class="note muted">{[s.tested_on && `Tested on ${s.tested_on}`, s.date].filter(Boolean).join(' · ')}</div>
      )}
      {s.findings && <div class="note">{s.findings}</div>}
      {s.url && (
        <a class="note" href={s.url} target="_blank" rel="noopener noreferrer">Open source (needs a connection)</a>
      )}
    </div>
  )
}

export const frostText = (access: string) =>
  ({
    transcript: 'Transcript read',
    description: 'Video description read only — verdict not verified',
    'title-only': 'Title and description only — verdict not verified',
    'not-found': 'No Chris Frost video found — nothing attributed to him',
  } as Record<string, string>)[access] ?? access
