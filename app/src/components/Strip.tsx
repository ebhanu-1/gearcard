import type { StripModel } from '../lib/lensView'
import { stripPos } from '../lib/lensView'
import { BAND_NAMES, fmtN } from '../lib/optics'

const pct = (x: number) => `${(x * 100).toFixed(2)}%`
const LEVEL_VAR = ['transparent', 'var(--b1)', 'var(--b2)', 'var(--b3)']

export function ApertureStrip({ strip, bodyLabel }: { strip: StripModel; bodyLabel: string }) {
  const { lo, hi } = strip
  const pos = (n: number) => stripPos(n, lo, hi)
  const label = strip.sweet ? `Sharpest f/${fmtN(strip.sweet.lo)} to f/${fmtN(strip.sweet.hi)}.` : 'Sharpest aperture not researched.'
  const inRange = strip.segments.filter((s) => s.from < hi)
  const aria = `${label} ${strip.thresholds.map((t) => `${t.label} from f/${fmtN(t.n)}`).join('; ')}.`
  return (
    <div class="card" role="img" aria-label={aria}>
      <div class="track">
        <span class="name">LENS</span>
        <div class="bar">
          {strip.tint && <i style={{ left: pct(pos(strip.tint.lo)), width: pct(pos(strip.tint.hi) - pos(strip.tint.lo)), background: 'var(--good-tint)' }} />}
          {strip.sweet && (
            <i
              style={{
                left: pct(pos(strip.sweet.lo)),
                width: `max(6px, ${pct(pos(strip.sweet.hi) - pos(strip.sweet.lo))})`,
                background: 'var(--good)',
              }}
            />
          )}
        </div>
      </div>
      <div class="track">
        <span class="name">{bodyLabel}</span>
        <div class="bar">
          {inRange.map((s, i) => {
            const from = pos(s.from)
            const next = inRange[i + 1] ? pos(inRange[i + 1].from) : 1
            return <i key={i} style={{ left: pct(from), width: pct(next - from), background: LEVEL_VAR[s.level] }} />
          })}
        </div>
      </div>
      <div class="track">
        <span class="name" />
        <div class="axis">
          {strip.ticks.map((t) => (
            <span key={t} style={{ left: pct(pos(t)) }}>{fmtN(t)}</span>
          ))}
          <span style={{ left: '0%', transform: 'none' }}>{fmtN(lo)}</span>
          <span style={{ right: '0%', left: 'auto', transform: 'none' }}>{fmtN(hi)}</span>
        </div>
      </div>
      <div class="legend">
        <span><em style={{ background: 'var(--good)' }} />Sharpest</span>
        {[1, 2, 3].map((l) => (
          <span key={l}><em style={{ background: LEVEL_VAR[l] }} />{BAND_NAMES[l]}</span>
        ))}
      </div>
    </div>
  )
}
