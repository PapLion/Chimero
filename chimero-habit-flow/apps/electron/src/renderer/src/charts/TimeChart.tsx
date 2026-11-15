import { useMemo, useState } from 'react'
import { diffDays, fmt } from '@/lib/dates'
import { num } from '@/lib/format'
import { cn } from '@/lib/cn'
import { niceScale, tickLabel, useSize } from './scale'

export interface ChartSeries {
  id: string
  label: string
  color: string
  points: ReadonlyArray<{ date: string; value: number }>
  unit?: string | null
  /** line: connect known days. bars: one bar per day (activities). */
  mode?: 'line' | 'bars'
  /** Draw this series thinner and without dots (e.g. a moving average). */
  subtle?: boolean
}

interface TimeChartProps {
  series: ChartSeries[]
  from: string
  to: string
  /** Horizontal reference line, e.g. a goal. */
  reference?: { value: number; label: string } | null
  /** Hide axes for small widgets. */
  bare?: boolean
  /** Force the y axis to include zero (bars always do). */
  zeroBased?: boolean
  yDomain?: [number, number]
  className?: string
  onPickDate?: (date: string) => void
}

/**
 * Time series chart on a calendar-day axis. Lines connect the days that have a
 * value and leave unknown days unmarked; bars draw one column per day.
 */
export function TimeChart({ series, from, to, reference, bare, zeroBased, yDomain, className, onPickDate }: TimeChartProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const totalDays = Math.max(1, diffDays(from, to))
  const hasBars = series.some((s) => s.mode === 'bars')

  const padding = bare ? { top: 6, right: 4, bottom: 4, left: 4 } : { top: 10, right: 12, bottom: 22, left: 40 }
  const plotW = Math.max(0, width - padding.left - padding.right)
  const plotH = Math.max(0, height - padding.top - padding.bottom)

  const scale = useMemo(() => {
    const values = series.flatMap((s) => s.points.map((p) => p.value))
    if (reference) values.push(reference.value)
    if (values.length === 0) return niceScale(0, 1)
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (hasBars || zeroBased) min = Math.min(0, min)
    if (yDomain) [min, max] = yDomain
    else if (!hasBars && !zeroBased) {
      const pad = (max - min || Math.abs(max) || 1) * 0.12
      min -= pad
      max += pad
    }
    return yDomain ? { min, max, ticks: niceScale(min, max, 4).ticks.filter((t) => t >= min && t <= max) } : niceScale(min, max, bare ? 2 : 4)
  }, [series, reference, hasBars, zeroBased, yDomain, bare])

  const x = (date: string) => padding.left + (hasBars ? (diffDays(from, date) + 0.5) / (totalDays + 1) : diffDays(from, date) / totalDays) * plotW
  const y = (value: number) => padding.top + plotH - ((value - scale.min) / (scale.max - scale.min || 1)) * plotH
  const barWidth = Math.max(1.5, Math.min(22, (plotW / (totalDays + 1)) * 0.68))

  const hoverDate = hover == null ? null : fmtOffset(from, hover)
  const hoverRows = hoverDate
    ? series.filter((s) => !s.subtle).map((s) => ({ series: s, point: s.points.find((p) => p.date === hoverDate) }))
    : []

  const xTicks = useMemo(() => {
    if (bare || plotW <= 0) return []
    const count = Math.max(2, Math.min(7, Math.floor(plotW / 90)))
    return Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * totalDays))
  }, [bare, plotW, totalDays])

  const empty = series.every((s) => s.points.length === 0)

  return (
    <div
      ref={ref}
      className={cn('relative h-full min-h-0 w-full', className)}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(event) => {
        if (plotW <= 0) return
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = (event.clientX - rect.left - padding.left) / plotW
        const offset = hasBars ? Math.floor(ratio * (totalDays + 1)) : Math.round(ratio * totalDays)
        setHover(Math.max(0, Math.min(totalDays, offset)))
      }}
      onClick={() => hoverDate && onPickDate?.(hoverDate)}
    >
      {width > 0 && height > 0 && (
        <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={series.map((s) => s.label).join(', ')}>
          {!bare &&
            scale.ticks.map((tick) => (
              <g key={tick}>
                <line x1={padding.left} x2={padding.left + plotW} y1={y(tick)} y2={y(tick)} className="stroke-line/60" strokeDasharray={tick === 0 ? undefined : '2 4'} />
                <text x={padding.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px]">
                  {tickLabel(tick)}
                </text>
              </g>
            ))}
          {xTicks.map((offset) => {
            const date = fmtOffset(from, offset)
            return (
              <text
                key={offset}
                x={x(date)}
                y={height - 5}
                textAnchor={offset === 0 ? 'start' : offset === totalDays ? 'end' : 'middle'}
                className="fill-faint text-[10px]"
              >
                {fmt.dayMonthShort(date)}
              </text>
            )
          })}
          {reference && (
            <g>
              <line x1={padding.left} x2={padding.left + plotW} y1={y(reference.value)} y2={y(reference.value)} className="stroke-good/70" strokeDasharray="5 4" />
              {!bare && (
                <text x={padding.left + plotW} y={y(reference.value) - 5} textAnchor="end" className="fill-good text-[10px] font-medium">
                  {reference.label}
                </text>
              )}
            </g>
          )}
          {series.map((s) =>
            s.mode === 'bars' ? (
              <g key={s.id}>
                {s.points.map((p) =>
                  p.value === 0 ? null : (
                    <rect
                      key={p.date}
                      x={x(p.date) - barWidth / 2}
                      y={Math.min(y(p.value), y(0))}
                      width={barWidth}
                      height={Math.max(1, Math.abs(y(0) - y(p.value)))}
                      rx={Math.min(3, barWidth / 2)}
                      fill={s.color}
                      opacity={hoverDate && hoverDate !== p.date ? 0.45 : 0.9}
                    />
                  ),
                )}
              </g>
            ) : (
              <g key={s.id}>
                {!s.subtle && s.points.length > 1 && !bare && (
                  <path
                    d={`${linePath(s.points, x, y)} L ${x(s.points[s.points.length - 1].date)} ${padding.top + plotH} L ${x(s.points[0].date)} ${padding.top + plotH} Z`}
                    fill={s.color}
                    opacity={0.07}
                  />
                )}
                <path d={linePath(s.points, x, y)} fill="none" stroke={s.color} strokeWidth={s.subtle ? 1.25 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={s.subtle ? 0.55 : 1} strokeDasharray={s.subtle ? '1 3' : undefined} />
                {!s.subtle && s.points.length <= 45 && !bare && s.points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.25} fill={s.color} />)}
                {!s.subtle && s.points.length === 1 && <circle cx={x(s.points[0].date)} cy={y(s.points[0].value)} r={3} fill={s.color} />}
              </g>
            ),
          )}
          {hoverDate && !empty && (
            <g pointerEvents="none">
              <line x1={x(hoverDate)} x2={x(hoverDate)} y1={padding.top} y2={padding.top + plotH} className="stroke-faint/60" />
              {hoverRows.map(({ series: s, point }) => (point && s.mode !== 'bars' ? <circle key={s.id} cx={x(point.date)} cy={y(point.value)} r={4} fill={s.color} className="stroke-surface" strokeWidth={2} /> : null))}
            </g>
          )}
        </svg>
      )}
      {hoverDate && !empty && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs shadow-pop"
          style={{ left: Math.max(0, Math.min(width - 150, x(hoverDate) + (x(hoverDate) > width * 0.6 ? -150 : 12))) }}
        >
          <p className="font-medium text-text">{fmt.full(hoverDate)}</p>
          {hoverRows.map(({ series: s, point }) => (
            <p key={s.id} className="mt-0.5 flex items-center gap-1.5 text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
              <span className="ml-auto pl-2 font-medium text-text">{point ? `${num(point.value, 2)}${s.unit ? ` ${s.unit}` : ''}` : 'no record'}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtOffset(from: string, offset: number): string {
  const [yy, mm, dd] = from.split('-').map(Number)
  const d = new Date(yy, mm - 1, dd + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function linePath(points: ReadonlyArray<{ date: string; value: number }>, x: (date: string) => number, y: (value: number) => number): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
}
