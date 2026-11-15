import { useMemo } from 'react'
import { useSize } from '@/charts/scale'
import { cn } from '@/lib/cn'
import { addDays, fmt, parseDateStr, rangeOfDays, todayStr } from '@/lib/dates'
import { plural } from '@/lib/format'
import { useOverview, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { colorOf } from '@/lib/trackers'
import { Tip } from '@/ui/primitives'

const SLOT = 44

/**
 * The recent past as a ribbon: one column per day, one tick per tracker that
 * has a record on it. Reading it shows at a glance which days are filled in;
 * clicking a day moves the whole dashboard there.
 */
export function DayStrip() {
  const { selectedDate, setSelectedDate } = useApp()
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { data: trackers = [] } = useTrackers()
  const today = todayStr()
  const count = Math.max(7, Math.min(60, Math.floor(width / SLOT)))
  // Keep the selected day in view when it is older than the window.
  const end = selectedDate > addDays(today, -(count - 1)) ? today : addDays(selectedDate, Math.floor(count / 2)) > today ? today : addDays(selectedDate, Math.floor(count / 2))
  const days = useMemo(() => rangeOfDays(end, count), [end, count])
  const { data } = useOverview(days[0], days[days.length - 1])
  const byDate = new Map((data?.days ?? []).map((day) => [day.date, day]))
  const order = trackers.map((t) => t.id)
  const color = new Map(trackers.map((t) => [t.id, colorOf(t)]))

  return (
    <div ref={ref} className="flex h-[58px] w-full items-stretch" role="listbox" aria-label="Recent days">
      {width > 0 &&
        days.map((date) => {
          const day = byDate.get(date)
          const ids = order.filter((id) => day?.byTracker[id])
          const d = parseDateStr(date)
          const selected = date === selectedDate
          const weekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <Tip key={date} side="bottom" label={`${fmt.weekday(date)}, ${fmt.dayMonth(date)} · ${day ? plural(day.total, 'record') : 'nothing recorded'}`}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setSelectedDate(date)}
                className={cn('group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-lg pb-1 pt-1 transition-colors', selected ? 'bg-raised' : 'hover:bg-raised/50')}
              >
                <span className="flex flex-1 flex-col-reverse items-center gap-[2px]">
                  {ids.slice(0, 7).map((id) => (
                    <span key={id} className="h-[3px] w-4 rounded-full" style={{ background: color.get(id) }} />
                  ))}
                </span>
                <span className={cn('text-2xs leading-none', selected ? 'text-muted' : weekend ? 'text-faint/70' : 'text-faint')}>{fmt.weekdayShort(date).slice(0, 2)}</span>
                <span className={cn('num text-sm font-semibold leading-none', selected ? 'text-text' : date === today ? 'text-accent' : 'text-muted')}>{d.getDate()}</span>
                {date === today && <span className="absolute -bottom-0.5 h-[2px] w-4 rounded-full bg-accent" />}
              </button>
            </Tip>
          )
        })}
    </div>
  )
}
