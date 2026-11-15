import { addDays, fmt, parseDateStr, todayStr } from '@/lib/dates'
import { plural } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Tip } from '@/ui/primitives'
import { useSize } from './scale'

interface HeatmapProps {
  /** value per day; days absent from the map are empty */
  values: ReadonlyMap<string, number>
  end?: string
  weekStartsOn: 0 | 1
  color?: string
  selected?: string
  onPick?: (date: string) => void
  unitLabel?: string
}

/** Calendar heatmap: one column per week, as many weeks as fit the width. */
export function Heatmap({ values, end = todayStr(), weekStartsOn, color = 'rgb(var(--accent))', selected, onPick, unitLabel = 'record' }: HeatmapProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const gap = 3
  const labelW = 26
  const cell = Math.max(8, Math.min(18, Math.floor((height - 16 - gap * 6) / 7)))
  const weeks = Math.max(4, Math.min(53, Math.floor((width - labelW) / (cell + gap))))
  const endDate = parseDateStr(end)
  const endColumnOffset = (endDate.getDay() - weekStartsOn + 7) % 7
  const start = addDays(end, -(weeks - 1) * 7 - endColumnOffset)
  const max = Math.max(1, ...values.values())
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const dayNames = weekStartsOn === 1 ? ['Mon', '', 'Wed', '', 'Fri', '', ''] : ['', 'Mon', '', 'Wed', '', 'Fri', '']

  return (
    <div ref={ref} className="flex h-full min-h-0 w-full flex-col justify-center overflow-hidden">
      {width > 0 && (
        <div className="flex" style={{ gap }}>
          <div className="flex shrink-0 flex-col pt-4 text-[10px] text-faint" style={{ width: labelW - gap, gap }}>
            {dayNames.map((name, i) => (
              <span key={i} style={{ height: cell, lineHeight: `${cell}px` }}>
                {name}
              </span>
            ))}
          </div>
          {columns.map((column, w) => {
            const first = parseDateStr(column[0])
            const showMonth = first.getDate() <= 7
            return (
              <div key={column[0]} className="flex flex-col" style={{ gap }}>
                <span className="h-3 text-[10px] leading-3 text-faint" style={{ width: cell }}>
                  {showMonth && w < weeks - 1 ? first.toLocaleString('en', { month: 'short' }) : ''}
                </span>
                {column.map((date) => {
                  const value = values.get(date) ?? 0
                  const future = date > end
                  const level = value === 0 ? 0 : 0.22 + 0.78 * Math.min(1, value / max)
                  return (
                    <Tip key={date} label={future ? fmt.full(date) : `${fmt.full(date)} · ${value === 0 ? `no ${unitLabel}s` : plural(value, unitLabel)}`} side="top">
                      <button
                        type="button"
                        disabled={future || !onPick}
                        onClick={() => onPick?.(date)}
                        aria-label={`${fmt.full(date)}: ${value}`}
                        className={cn('rounded-[3px] transition-transform enabled:hover:scale-125', value === 0 && 'bg-line/50', future && 'opacity-0', selected === date && 'ring-2 ring-text ring-offset-1 ring-offset-surface')}
                        style={{ width: cell, height: cell, background: value > 0 ? color : undefined, opacity: future ? 0 : value > 0 ? level : undefined }}
                      />
                    </Tip>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
