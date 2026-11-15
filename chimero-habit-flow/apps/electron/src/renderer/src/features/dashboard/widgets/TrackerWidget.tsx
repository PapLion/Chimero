import { useState } from 'react'
import type { DashboardWidget, Entry, Tracker } from '@contracts/contracts'
import { buildTaskDayReadModel } from '@contracts/domain'
import { ArrowDownRight, ArrowUpRight, Check, CornerDownRight } from 'lucide-react'
import { TimeChart } from '@/charts/TimeChart'
import { Sparkline } from '@/charts/Sparkline'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { addDays, diffDays, fmt, timestampFor, todayStr } from '@/lib/dates'
import { describeEntry, moodColor, moodWord } from '@/lib/entries'
import { num, plural, signed } from '@/lib/format'
import { TrackerIcon } from '@/lib/icons'
import { useAction, useData, usePreferences } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { colorOf, identityOf, kindOf } from '@/lib/trackers'
import { Tip } from '@/ui/primitives'
import { entriesOf, primaryMetricId, useDayEntries, useSeries } from '../data'
import { WidgetFrame } from '../WidgetFrame'

interface Props {
  widget: DashboardWidget
  tracker: Tracker
  date: string
}

/** One tracker on the dashboard. What it shows depends on the tracker and on how much room it has. */
export function TrackerWidget({ widget, tracker, date }: Props) {
  const { navigate, openEntry } = useApp()
  const identity = identityOf(tracker)
  const color = colorOf(tracker)
  const from = addDays(date, -29)
  const metricId = primaryMetricId(tracker)
  const { data: day } = useDayEntries(date)
  const { data: seriesData } = useSeries([metricId], from, date)
  const series = seriesData?.series.find((s) => s.metric.id === metricId)
  const entries = entriesOf(day, tracker.id)

  const roomy = widget.w >= 3 && widget.h >= 3
  const wide = widget.w >= 6 && widget.h >= 3
  const showList = widget.h >= 4 || (widget.h >= 3 && widget.w < 3) || wide
  const isMeasure = series?.metric.kind === 'measure'

  let body
  if (identity === 'tasks') body = <TaskList tracker={tracker} date={date} compact={widget.h <= 2} />
  else {
    const headline = <Headline tracker={tracker} entries={entries} series={series?.points ?? []} date={date} unit={series?.metric.unit ?? null} compact={widget.w <= 2} />
    const chart =
      series && series.points.length > 1 ? (
        widget.w >= 5 && widget.h >= 4 ? (
          <TimeChart
            series={[{ id: metricId, label: series.metric.label, color, unit: series.metric.unit, points: series.points, mode: isMeasure ? 'line' : 'bars' }]}
            from={from}
            to={date}
            yDomain={identity === 'mood' ? [1, 10] : undefined}
          />
        ) : isMeasure ? (
          <Sparkline values={series.points.map((p) => p.value)} color={color} className="h-full w-full" />
        ) : (
          <TimeChart bare series={[{ id: metricId, label: series.metric.label, color, unit: series.metric.unit, points: series.points, mode: 'bars' }]} from={from} to={date} />
        )
      ) : null
    const list = showList ? <DayList entries={entries} tracker={tracker} /> : null
    const quick = <QuickLog tracker={tracker} date={date} entries={entries} room={widget.w} />

    body = wide ? (
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-[38%] min-w-0 flex-col gap-2">
          {headline}
          {quick}
          {list}
        </div>
        <div className="min-h-0 min-w-0 flex-1">{chart ?? <ChartPlaceholder />}</div>
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {headline}
        {roomy && chart && <div className={cn('min-h-[36px]', list ? 'h-[38%] shrink-0' : 'flex-1')}>{chart}</div>}
        {(roomy || widget.w >= 3) && quick}
        {list}
      </div>
    )
  }

  return (
    <WidgetFrame
      title={tracker.name}
      icon={<TrackerIcon name={tracker.icon} color={color} />}
      accent={color}
      onOpen={() => navigate({ page: 'tracker', id: tracker.id })}
      onAdd={() => openEntry({ trackerId: tracker.id, date })}
    >
      {body}
    </WidgetFrame>
  )
}

function ChartPlaceholder() {
  return <div className="grid h-full place-items-center rounded-lg border border-dashed border-line text-xs text-faint">A chart appears after two days of records</div>
}

function Headline({ tracker, entries, series, date, unit, compact }: { tracker: Tracker; entries: Entry[]; series: ReadonlyArray<{ date: string; value: number }>; date: string; unit: string | null; compact: boolean }) {
  const identity = identityOf(tracker)
  const kind = kindOf(tracker)
  const today = series.find((p) => p.date === date)
  const size = compact ? 'text-2xl' : 'text-3xl'

  // State-like trackers show the latest known reading, and say how old it is.
  if (identity === 'weight' || (identity === 'generic' && kind === 'numeric' && tracker.config.valueKind === 'measure')) {
    const last = series[series.length - 1]
    const previous = series[series.length - 2]
    if (!last) return <Nothing>No reading yet</Nothing>
    const delta = previous ? last.value - previous.value : null
    return (
      <div>
        <p className={cn('num font-semibold leading-none', size)}>
          {num(last.value)}
          <span className="ml-1 text-base font-medium text-muted">{unit}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          {delta != null && delta !== 0 && (delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
          {delta != null && <span>{signed(delta)}</span>}
          <span className="text-faint">{last.date === date ? (delta != null ? 'since last' : fmt.relativeDay(date).toLowerCase()) : `from ${fmt.relativeDay(last.date).toLowerCase()}`}</span>
        </p>
      </div>
    )
  }

  if (identity === 'mood' || kind === 'range') {
    const max = identity === 'mood' ? 10 : (tracker.config.max ?? 10)
    if (!today) return <Nothing>{`No check-in ${date === todayStr() ? 'today' : 'this day'}`}</Nothing>
    return (
      <div className="flex items-center gap-2.5">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: identity === 'mood' ? moodColor(today.value) : colorOf(tracker) }} />
        <div className="min-w-0">
          <p className={cn('num font-semibold leading-none', size)}>
            {num(today.value)}
            <span className="ml-0.5 text-base font-medium text-faint">/{max}</span>
          </p>
          <p className="mt-1 truncate text-xs text-muted">
            {identity === 'mood' ? `${moodWord(today.value)} · ` : ''}
            {plural(entries.length, 'check-in')}
          </p>
        </div>
      </div>
    )
  }

  if (kind === 'binary' && identity === 'generic') return null

  if (entries.length === 0) return <Nothing>{`Nothing logged ${date === todayStr() ? 'today' : 'this day'}`}</Nothing>

  const figure = (() => {
    switch (identity) {
      case 'gaming':
        return { value: num(entries.reduce((sum, e) => sum + (e.gaming?.estimatedHours ?? 0), 0)), unit: 'h' }
      case 'exercise': {
        const minutes = entries.reduce((sum, e) => sum + (e.session?.minutes ?? 0), 0)
        return minutes > 0 ? { value: num(minutes, 0), unit: 'min' } : { value: String(entries.length), unit: entries.length === 1 ? 'session' : 'sessions' }
      }
      case 'diet': {
        const kcal = entries.reduce((sum, e) => sum + (e.food?.calories ?? 0), 0)
        return kcal > 0 ? { value: num(kcal, 0), unit: 'kcal' } : { value: String(entries.length), unit: entries.length === 1 ? 'food' : 'foods' }
      }
      case 'social': {
        const people = new Set(entries.flatMap((e) => (e.socialInteractions ?? []).map((i) => i.contactId)))
        return people.size > 0 ? { value: String(people.size), unit: people.size === 1 ? 'person' : 'people' } : { value: String(entries.length), unit: 'logged' }
      }
      case 'generic':
        if (kind === 'numeric' && today) return { value: num(today.value, 2), unit: unit ?? '' }
        return { value: String(entries.length), unit: entries.length === 1 ? 'entry' : 'entries' }
      default:
        return { value: String(entries.length), unit: 'logged' }
    }
  })()
  const goal = identity === 'generic' && kind === 'numeric' && today && tracker.config.goal ? tracker.config.goal : null

  return (
    <div>
      <p className={cn('num font-semibold leading-none', size)}>
        {figure.value}
        <span className="ml-1 text-base font-medium text-muted">{figure.unit}</span>
      </p>
      {goal ? (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((today?.value ?? 0) / goal) * 100)}%`, background: colorOf(tracker) }} />
          </div>
          <p className="mt-1 text-xs text-faint">
            of {num(goal)} {unit}
          </p>
        </div>
      ) : (
        <p className="mt-1 truncate text-xs text-muted">{fmt.relativeDay(date)}</p>
      )}
    </div>
  )
}

function Nothing({ children }: { children: string }) {
  return <p className="py-1 text-sm text-faint">{children}</p>
}

function DayList({ entries, tracker }: { entries: Entry[]; tracker: Tracker }) {
  const prefs = usePreferences()
  const { openEntry } = useApp()
  if (entries.length === 0) return null
  return (
    <ul className="scroll-fade -mx-1 min-h-0 flex-1 overflow-hidden">
      {[...entries].reverse().map((entry) => {
        const line = describeEntry(entry, tracker, prefs)
        return (
          <li key={entry.id}>
            <button type="button" onClick={() => openEntry({ edit: { entryId: entry.id, trackerId: tracker.id } })} className="flex w-full items-baseline gap-2 rounded px-1 py-[3px] text-left hover:bg-raised">
              <span className="w-[52px] shrink-0 text-2xs text-faint">{fmt.time(entry.timestamp, prefs.timeFormat)}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{line.title}</span>
              {line.detail && <span className="max-w-[45%] shrink truncate text-xs text-muted">{line.detail}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** One-tap logging for trackers where a single value is the whole record. */
function QuickLog({ tracker, date, entries, room }: { tracker: Tracker; date: string; entries: Entry[]; room: number }) {
  const run = useAction()
  const identity = identityOf(tracker)
  const kind = kindOf(tracker)
  const color = colorOf(tracker)
  const add = (value: number) => void run(() => must(api.addEntry({ trackerId: tracker.id, value, timestamp: timestampFor(date) }), 'The entry was not saved'))

  if (identity === 'mood' && room >= 3) {
    return (
      <div className="flex shrink-0 gap-[3px]" role="group" aria-label="Log mood">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
          <Tip key={score} label={`${score} · ${moodWord(score)}`} side="top">
            <button type="button" onClick={() => add(score)} aria-label={`Log mood ${score}`} className="h-6 min-w-0 flex-1 rounded-[5px] text-2xs font-semibold text-black/70 opacity-45 transition-opacity hover:opacity-100" style={{ background: moodColor(score) }}>
              {room >= 4 ? score : ''}
            </button>
          </Tip>
        ))}
      </div>
    )
  }
  if (identity !== 'generic') return null

  if (kind === 'binary') {
    const done = entries.find((e) => (e.value ?? 1) >= 1)
    return (
      <button
        type="button"
        onClick={() => void run<unknown>(() => (done ? must(api.deleteEntry(done.id), 'Could not undo') : must(api.addEntry({ trackerId: tracker.id, value: 1, timestamp: timestampFor(date) }), 'The entry was not saved')))}
        aria-pressed={!!done}
        className={cn('flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border text-base font-medium transition-colors', done ? 'border-transparent text-black/80' : 'border-dashed border-line text-muted hover:border-faint hover:text-text')}
        style={done ? { background: color } : undefined}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
        {done ? 'Done' : 'Mark done'}
      </button>
    )
  }
  if (kind === 'numeric' && (tracker.config.quickValues?.length ?? 0) > 0) {
    return (
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {tracker.config.quickValues?.slice(0, room >= 4 ? 4 : 2).map((value) => (
          <button key={value} type="button" onClick={() => add(value)} className="h-6 rounded-full border border-line px-2 text-xs font-medium text-muted hover:border-faint hover:text-text">
            +{num(value)} {tracker.config.unit}
          </button>
        ))}
      </div>
    )
  }
  if (kind === 'range' && room >= 3) {
    const max = Math.min(10, tracker.config.max ?? 10)
    const min = tracker.config.min ?? 1
    return (
      <div className="flex shrink-0 gap-[3px]" role="group" aria-label={`Log ${tracker.name}`}>
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((score) => (
          <button key={score} type="button" onClick={() => add(score)} aria-label={`Log ${score}`} className="h-6 min-w-0 flex-1 rounded-[5px] bg-line text-2xs font-semibold text-muted hover:text-black/80" onMouseEnter={(e) => (e.currentTarget.style.background = color)} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
            {score}
          </button>
        ))}
      </div>
    )
  }
  return null
}

function TaskList({ tracker, date, compact }: { tracker: Tracker; date: string; compact: boolean }) {
  const run = useAction()
  const { openEntry } = useApp()
  const [text, setText] = useState('')
  const { data: all = [] } = useData(['tasks', tracker.id], () => api.getTaskEntries(tracker.id, { limit: 1000 }))
  const day = buildTaskDayReadModel(all, date)
  const done = day.actionable.filter((t) => t.completed).length
  const color = colorOf(tracker)

  const add = () => {
    const note = text.trim()
    if (!note) return
    setText('')
    void run(() => must(api.addEntry({ trackerId: tracker.id, value: 0, note, timestamp: timestampFor(date) }), 'The task was not saved'))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-1.5 shrink-0 text-xs text-muted">{day.actionable.length === 0 ? `Nothing planned for ${fmt.relativeDay(date).toLowerCase()}` : `${done} of ${day.actionable.length} done`}</p>
      {!compact && (
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
          {day.actionable.map((task) => (
            <li key={task.entryId} className="group/task flex items-center gap-2 rounded px-1 py-[3px] hover:bg-raised">
              <button
                type="button"
                role="checkbox"
                aria-checked={task.completed}
                aria-label={task.text}
                onClick={() => void run(() => must(api.updateEntry(task.entryId, { value: task.completed ? 0 : 1 }), 'The task was not updated'))}
                className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors', task.completed ? 'border-transparent text-black/80' : 'border-faint hover:border-text')}
                style={task.completed ? { background: color } : undefined}
              >
                {task.completed && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </button>
              <button type="button" onClick={() => openEntry({ edit: { entryId: task.entryId, trackerId: tracker.id } })} className={cn('min-w-0 flex-1 truncate text-left text-sm', task.completed && 'text-faint line-through')}>
                {task.text}
              </button>
              {task.dateStr !== date && (
                <Tip label={`Moved from ${fmt.dayMonthShort(task.dateStr)} · ${plural(diffDays(task.dateStr, date), 'day')} ago`}>
                  <CornerDownRight className="h-3 w-3 shrink-0 text-warn" />
                </Tip>
              )}
            </li>
          ))}
        </ul>
      )}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && add()}
        placeholder="Add a task"
        aria-label="Add a task"
        className="mt-1.5 h-7 w-full shrink-0 rounded-md border border-transparent bg-raised/60 px-2 text-sm placeholder:text-faint hover:border-line focus:border-accent focus:outline-none"
      />
    </div>
  )
}
