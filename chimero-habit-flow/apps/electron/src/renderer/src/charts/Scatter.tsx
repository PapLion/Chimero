import { useState } from 'react'
import { fmt } from '@/lib/dates'
import { num } from '@/lib/format'
import { niceScale, tickLabel, useSize } from './scale'

interface ScatterProps {
  points: ReadonlyArray<{ date: string; x: number; y: number }>
  fit: { slope: number; intercept: number } | null
  xLabel: string
  yLabel: string
  color: string
}

/** Each dot is one day. Overlapping days are nudged apart deterministically so density is visible. */
export function Scatter({ points, fit, xLabel, yLabel, color }: ScatterProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const padding = { top: 12, right: 16, bottom: 38, left: 52 }
  const plotW = Math.max(0, width - padding.left - padding.right)
  const plotH = Math.max(0, height - padding.top - padding.bottom)
  const xs = niceScale(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x)), 5)
  const ys = niceScale(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)), 4)
  const px = (v: number) => padding.left + ((v - xs.min) / (xs.max - xs.min || 1)) * plotW
  const py = (v: number) => padding.top + plotH - ((v - ys.min) / (ys.max - ys.min || 1)) * plotH

  const seen = new Map<string, number>()
  const placed = points.map((p) => {
    const key = `${p.x}|${p.y}`
    const index = seen.get(key) ?? 0
    seen.set(key, index + 1)
    const angle = index * 2.399963
    const radius = index === 0 ? 0 : Math.min(9, 2.4 * Math.sqrt(index))
    return { ...p, cx: px(p.x) + Math.cos(angle) * radius, cy: py(p.y) + Math.sin(angle) * radius }
  })
  const hovered = hover == null ? null : placed[hover]

  return (
    <div ref={ref} className="relative h-full w-full" onMouseLeave={() => setHover(null)}>
      {width > 0 && height > 0 && (
        <svg width={width} height={height} className="block" role="img" aria-label={`${yLabel} against ${xLabel}`}>
          {ys.ticks.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={padding.left} x2={padding.left + plotW} y1={py(tick)} y2={py(tick)} className="stroke-line/60" strokeDasharray="2 4" />
              <text x={padding.left - 8} y={py(tick)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px]">
                {tickLabel(tick)}
              </text>
            </g>
          ))}
          {xs.ticks.map((tick) => (
            <text key={`x${tick}`} x={px(tick)} y={padding.top + plotH + 14} textAnchor="middle" className="fill-faint text-[10px]">
              {tickLabel(tick)}
            </text>
          ))}
          <text x={padding.left + plotW / 2} y={height - 4} textAnchor="middle" className="fill-muted text-[11px]">
            {xLabel}
          </text>
          <text transform={`translate(12 ${padding.top + plotH / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted text-[11px]">
            {yLabel}
          </text>
          {fit && (
            <line
              x1={px(xs.min)}
              x2={px(xs.max)}
              y1={py(clamp(fit.intercept + fit.slope * xs.min, ys.min, ys.max))}
              y2={py(clamp(fit.intercept + fit.slope * xs.max, ys.min, ys.max))}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="6 5"
              opacity={0.7}
            />
          )}
          {placed.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={hover === i ? 5.5 : 3.5} fill={color} opacity={hover == null || hover === i ? 0.75 : 0.3} onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      )}
      {hovered && (
        <div className="pointer-events-none absolute z-10 w-max rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs shadow-pop" style={{ left: Math.min(width - 170, hovered.cx + 10), top: Math.max(0, hovered.cy - 48) }}>
          <p className="font-medium">{fmt.full(hovered.date)}</p>
          <p className="text-muted">
            {xLabel}: <span className="text-text">{num(hovered.x, 2)}</span>
          </p>
          <p className="text-muted">
            {yLabel}: <span className="text-text">{num(hovered.y, 2)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
