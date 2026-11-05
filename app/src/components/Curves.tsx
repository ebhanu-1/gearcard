// The Sharpness section of the Lens Card (change brief v1.5): Overall first, Center / Corners behind an expander.
import { type ChartModel, type CurveModel, type Row, buildChart } from '../lib/curves'
import type { CurveCard } from '../lib/lensView'
import { fmtN, snapThird, TC_FACTOR } from '../lib/optics'
import { setFocal } from '../lib/state'
import type { Lens } from '../lib/types'

const KIND_TEXT: Record<string, string> = {
  rising: 'still rising', peak: 'peak', fine: 'still fine', downhill: 'downhill', soft: 'clearly softer', unknown: 'not measured',
}

export function StripRow({ row, label, big, inferred }: { row: Row; label: string; big?: boolean; inferred?: boolean }) {
  return (
    <div class={`srow ${big ? 'big' : ''}`}>
      <span class="sname">{label}</span>
      <div class="cells" role="img" aria-label={`${label}: ${row.cells.map((c) => `f/${fmtN(c.n)} ${KIND_TEXT[c.kind]}`).join(', ')}`}>
        {row.cells.map((c) => (
          <i key={c.n} class={`cell k-${c.kind} ${c.dashed ? 'dashed' : ''}`}>{fmtN(c.n)}</i>
        ))}
      </div>
      {inferred && <span class="sr-only">inferred</span>}
    </div>
  )
}

function Legend() {
  return (
    <div class="legend">
      {(['rising', 'peak', 'fine', 'downhill', 'soft'] as const).map((k) => (
        <span key={k}><em class={`k-${k}`} />{k === 'rising' ? 'Rising' : k === 'peak' ? 'Peak' : k === 'fine' ? 'Still fine' : k === 'downhill' ? 'Downhill' : 'Clearly softer'}</span>
      ))}
    </div>
  )
}

const W = 320
const PAD = 6

/** Shapes only: no y-axis numbers, because reviews give verdicts and aperture ranges, not one MTF scale. */
export function CurveChart({ model, chart, kind, height }: { model: CurveModel; chart: ChartModel; kind: 'overall' | 'detail'; height: number }) {
  const N = model.apertures.length
  const top = 8
  const bottom = height - 20
  const px = (pos: number) => PAD + ((pos + 0.5) / N) * (W - 2 * PAD)
  const py = (y: number) => top + (1 - y) * (bottom - top)
  const path = (fn: (x: number) => number) => {
    const [a, b] = chart.domain
    const pts: string[] = []
    const steps = 90
    for (let i = 0; i <= steps; i++) {
      const x = a + ((b - a) * i) / steps
      pts.push(`${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(fn(x)).toFixed(1)}`)
    }
    return pts.join('')
  }
  const bandRect = (b: [number, number] | null, key: string) =>
    b ? <rect key={key} x={px(b[0])} y={top - 2} width={Math.max(2, px(b[1]) - px(b[0]))} height={bottom - top + 2} rx="4" class="band" /> : null
  return (
    <svg viewBox={`0 0 ${W} ${height}`} class="chart" role="img" aria-label={kind === 'overall' ? 'Overall sharpness shape across apertures, peak band shaded' : 'Center (solid) and corner (dashed) sharpness shape across apertures'}>
      {kind === 'overall' ? bandRect(chart.overallBand, 'o') : [bandRect(chart.centerBand, 'c'), bandRect(chart.cornerBand, 'k')]}
      <line x1={PAD} x2={W - PAD} y1={bottom} y2={bottom} class="axis-line" />
      {model.apertures.map((n, i) => (
        <g key={n}>
          <line x1={px(i)} x2={px(i)} y1={bottom} y2={bottom + 4} class="axis-line" />
          <text x={px(i)} y={height - 6} text-anchor="middle" class="tick">{fmtN(n)}</text>
        </g>
      ))}
      {kind === 'overall' ? (
        <path d={path(chart.overall)} class="curve-overall" />
      ) : (
        <>
          <path d={path(chart.center)} class="curve-center" />
          <path d={path(chart.corners)} class="curve-corner" />
        </>
      )}
    </svg>
  )
}

const stopsText = (factor: number) => {
  const s = Math.round(2 * Math.log2(factor) * 3) / 3
  const whole = Math.floor(s + 1e-9)
  const frac = Math.round((s - whole) * 3)
  const f = frac === 1 ? '⅓' : frac === 2 ? '⅔' : ''
  return `${whole || ''}${f}` || '0'
}

export function CurveSection({ lens, card, onMag }: { lens: Lens; card: CurveCard; onMag: (m: string) => void }) {
  if (card.status === 'missing') {
    return (
      <section class="sec">
        <h2>Sharpness by aperture</h2>
        <div class="card"><p class="note">Not researched: this lens has no entry in lens-curves.json yet.</p></div>
      </section>
    )
  }
  if (card.status === 'error' || !card.model || !card.pick) {
    return (
      <section class="sec">
        <h2>Sharpness by aperture</h2>
        <div class="avoid">
          <b>Data error</b>
          <p class="note">{card.errors[0] ?? 'This lens’s curve data could not be read.'} Fix the entry in lens-curves.json; every other lens is unaffected.</p>
        </div>
      </section>
    )
  }
  const m = card.model
  const e = m.entry.raw
  const chart = buildChart(m)
  const full = (r: { lo: number; hi: number }) => (r.lo === r.hi ? `f/${fmtN(r.lo)}` : `f/${fmtN(r.lo)}–f/${fmtN(r.hi)}`)
  const fmt = (r: Row) => (r.range ? full(r.range) : 'not measured')
  const inferredTag = e.confidence === 'inferred'
  const peakNote = m.inferredPeaks
  const opts = card.pick.options
  const showFocal = lens.kind === 'zoom' && opts.length > 1
  const dropSet = Math.max(m.start, snapThird(m.downhillEff / m.factor))

  return (
    <section class="sec">
      <h2>Sharpness by aperture</h2>
      <div class="card curve">
        {showFocal && (
          <div class="sec" style={{ gap: 6 }}>
            <span class="lbl">Focal length{e.tc ? ' (with TC-1.4x, displayed)' : ''}</span>
            <div class="steps" role="group" aria-label="Curve focal length">
              {opts.map((o) => (
                <button key={o.entry.raw.focal_mm} aria-pressed={o.entry === m.entry} onClick={() => setFocal(lens.id, o.entry.raw.tc ? o.entry.raw.focal_mm / TC_FACTOR : o.entry.raw.focal_mm)}>
                  {o.role ? `${o.role[0].toUpperCase()}${o.role.slice(1)} ` : ''}{o.entry.raw.focal_mm}
                </button>
              ))}
            </div>
            {!card.pick.exact && <span class="note muted">Closest researched focal length: {e.focal_mm} mm.</span>}
          </div>
        )}
        {card.mags.length > 1 && (
          <div class="sec" style={{ gap: 6 }}>
            <span class="lbl">Magnification</span>
            <div class="steps" role="group" aria-label="Magnification">
              {card.mags.map((o) => (
                <button key={o.value} aria-pressed={o.value === card.mag} onClick={() => onMag(o.value)}>{o.label}</button>
              ))}
            </div>
            <span class="note muted">
              {card.macroMode === 'displayed'
                ? 'The camera shows the effective aperture, so these are the numbers you read; no shift.'
                : m.factor > 1
                  ? `The strip shows what you set. At ${m.magLabel} each set aperture acts ${stopsText(m.factor)} stops smaller, so the strip is shifted ${stopsText(m.factor)} stops to show what you dial in.`
                  : 'Strip in set apertures; at close range it shifts to the smaller effective aperture.'}
            </span>
          </div>
        )}
        {card.pick.tcMissing && <span class="note muted">No with-converter result for this lens: showing the bare lens (apertures not shifted).</span>}

        <div class="ov-head">
          <div>
            <span class="lbl">Overall · whole frame</span>
            <div class="ov-range">{m.allPastPeak && m.factor > 1 ? 'past the peak' : fmt(m.overall)}</div>
          </div>
          <div class="tags">
            {m.overall.derived && <span class="tag">derived</span>}
            {inferredTag && <span class="tag inf">inferred</span>}
          </div>
        </div>
        <CurveChart model={m} chart={chart} kind="overall" height={118} />
        <StripRow row={m.overall} label="Overall" big inferred={inferredTag} />
        <Legend />
        <p class="reco">{m.recommendation}</p>
        <p class="note muted">Shape, not measured values.</p>

        <details class="split">
          <summary>Center / Corners</summary>
          <div class="detail">
            {chart.hasSplit ? (
              <>
                <CurveChart model={m} chart={chart} kind="detail" height={96} />
                <div class="legend"><span><em class="ln solid" />Center</span><span><em class="ln dashed" />Corners</span></div>
              </>
            ) : (
              <p class="note muted">Center and corners were not researched separately for this entry.</p>
            )}
            <StripRow row={m.center} label="Center" />
            <p class="note rowtxt"><b>Center peak:</b> {fmt(m.center)}</p>
            <StripRow row={m.corners} label="Corners" />
            <p class="note rowtxt"><b>Corners peak:</b> {fmt(m.corners)}</p>
            <p class="note muted">Shape, not measured values.</p>
          </div>
        </details>

        <p class="note"><b>Wide open:</b> {e.wideOpen}</p>
        {m.fallback && (
          <p class="note muted">Drop-off not researched for this entry: shown from {`f/${fmtN(dropSet)}`} ({lens.coverage === 'DX' ? 'DX-coverage lens' : 'f/11 on FX, f/7.1 on DX bodies'} fallback).</p>
        )}
        {peakNote && <p class="note muted">Peak range inferred, not measured.</p>}
        {e.note && <p class="note muted">{e.note}</p>}
        <p class="foot">Sources: {e.source} · updated {card.lastUpdated}</p>
      </div>
    </section>
  )
}
