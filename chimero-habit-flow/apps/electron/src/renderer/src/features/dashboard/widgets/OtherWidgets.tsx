import { useEffect, useState } from 'react'
import type { DashboardWidget } from '@contracts/contracts'
import { Bell, Cake, CalendarClock, Check, Flame, FlaskConical, Grid3x3, LineChart, ListChecks, StickyNote, Users } from 'lucide-react'
import { Heatmap } from '@/charts/Heatmap'
import { TimeChart } from '@/charts/TimeChart'
import { movingAverage } from '@/charts/scale'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { addDays, fmt, todayStr } from '@/lib/dates'
import { describeEntry } from '@/lib/entries'
import { initials, num, plural } from '@/lib/format'
import { TrackerIcon } from '@/lib/icons'
import { describePair, shortFinding, strengthLabel } from '@/lib/insight'
import { useAction, useContacts, useData, useOverview, usePreferences, useTrackers } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { useNudges } from '@/lib/people'
import { clock, isDoneOn, occursOn } from '@/lib/reminders'
import { colorOf } from '@/lib/trackers'
import { Empty } from '@/ui/primitives'
import { useDayEntries, useSeries } from '../data'
import { WidgetFrame } from '../WidgetFrame'

interface Props {
  widget: DashboardWidget
  date: string
}

export function TrendWidget({ widget, date }: Props) {
  const days = widget.days ?? 90
  const from = addDays(date, -(days - 1))
  const { data } = useSeries(widget.metricId ? [widget.metricId] : [], from, date)
  const series = data?.series[0]
  const summary = data?.summaries[0]
  const color = series?.metric.color ?? 'rgb(var(--accent))'
  const measure = series?.metric.kind === 'measure'
  return (
    <WidgetFrame
      title={series ? `${series.metric.group === series.metric.label ? '' : `${series.metric.group} · `}${series.metric.label}` : 'Trend'}
      icon={<LineChart className="text-muted" />}
      meta={summary?.mean != null ? `avg ${num(summary.mean)}${series?.metric.unit ? ` ${series.metric.unit}` : ''} · ${days} days` : `${days} days`}
    >
      {series && series.points.length > 1 ? (
        <TimeChart
          from={from}
          to={date}
          series={[
            { id: series.metric.id, label: series.metric.label, color, unit: series.metric.unit, points: series.points, mode: measure ? 'line' : 'bars' },
            ...(measure && series.points.length >= 10 ? [{ id: 'avg', label: '7-day average', color, points: movingAverage(series.points, 7), subtle: true }] : []),
          ]}
        />
      ) : (
        <Empty title="Not enough records yet">This chart fills in once the metric has at least two days of data in the last {days} days.</Empty>
      )}
    </WidgetFrame>
  )
}

export function HeatmapWidget({ date }: Props) {
  const prefs = usePreferences()
  const { setSelectedDate } = useApp()
  const today = todayStr()
  const { data } = useOverview(addDays(today, -377), today)
  const values = new Map((data?.days ?? []).map((day) => [day.date, day.total]))
  return (
    <WidgetFrame title="Activity" icon={<Grid3x3 className="text-muted" />} meta={data ? `${plural(data.totalEntries, 'record')} on ${plural(data.activeDays, 'day')}` : undefined}>
      <Heatmap values={values} weekStartsOn={prefs.weekStartsOn} selected={date} onPick={setSelectedDate} />
    </WidgetFrame>
  )
}

export function StreakWidget({ widget }: Props) {
  const today = todayStr()
  const { data } = useOverview(addDays(today, -377), today)
  const current = data?.currentStreak ?? 0
  return (
    <WidgetFrame title="Logging streak" icon={<Flame className={current > 0 ? 'text-warn' : 'text-muted'} />}>
      <div className="flex flex-1 flex-col justify-center">
        <p className="num text-4xl font-semibold leading-none">
          {current}
          <span className="ml-1.5 text-base font-medium text-muted">{current === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="mt-1.5 text-xs text-muted">{current === 0 ? 'Log anything today to start one' : widget.h >= 2 ? `Longest so far: ${plural(data?.bestStreak ?? 0, 'day')}` : ''}</p>
      </div>
    </WidgetFrame>
  )
}

export function DayLogWidget({ date }: Props) {
  const prefs = usePreferences()
  const { openEntry } = useApp()
  const { data: trackers = [] } = useTrackers()
  const { data: entries = [] } = useDayEntries(date)
  const byId = new Map(trackers.map((t) => [t.id, t]))
  const visible = entries.filter((entry) => byId.has(entry.trackerId))
  return (
    <WidgetFrame title={`${fmt.relativeDay(date)}'s log`} icon={<ListChecks className="text-muted" />} meta={visible.length > 0 ? plural(visible.length, 'record') : undefined} onAdd={() => openEntry({ date })} addLabel="Log something">
      {visible.length === 0 ? (
        <Empty title="Nothing recorded">Press Alt+Q, or the plus on any tracker, to log this day.</Empty>
      ) : (
        <ol className="-mx-1.5 min-h-0 flex-1 overflow-y-auto">
          {visible.map((entry) => {
            const tracker = byId.get(entry.trackerId)
            if (!tracker) return null
            const line = describeEntry(entry, tracker, prefs)
            return (
              <li key={entry.id}>
                <button type="button" onClick={() => openEntry({ edit: { entryId: entry.id, trackerId: tracker.id } })} className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-raised">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: `${colorOf(tracker)}22` }}>
                    <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{line.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {tracker.name}
                      {line.detail ? ` · ${line.detail}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-2xs text-faint">{fmt.time(entry.timestamp, prefs.timeFormat)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </WidgetFrame>
  )
}

export function RemindersWidget({ date }: Props) {
  const { navigate } = useApp()
  const run = useAction()
  const { data: reminders = [] } = useData(['reminders'], () => api.getReminders())
  const prefs = usePreferences()
  const due = reminders.filter((r) => r.enabled && occursOn(r, date)).sort((a, b) => a.time.localeCompare(b.time))
  return (
    <WidgetFrame title="Reminders" icon={<Bell className="text-muted" />} onOpen={() => navigate({ page: 'reminders' })} meta={due.length > 0 ? fmt.relativeDay(date) : undefined}>
      {due.length === 0 ? (
        <Empty title="Nothing scheduled">Add reminders to be nudged at a set time.</Empty>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
          {due.map((reminder) => {
            const done = isDoneOn(reminder, date)
            return (
              <li key={reminder.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-raised">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={reminder.title}
                  onClick={() => void run(() => must(done ? api.uncompleteReminder(reminder.id) : api.completeReminder(reminder.id), 'The reminder was not updated'))}
                  className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', done ? 'border-transparent bg-good text-black/80' : 'border-faint hover:border-text')}
                >
                  {done && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </button>
                <span className={cn('min-w-0 flex-1 truncate text-sm', done && 'text-faint line-through')}>{reminder.title}</span>
                <span className="shrink-0 text-xs text-muted">{clock(reminder.time, prefs.timeFormat)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetFrame>
  )
}

export function PeopleWidget(_: Props) {
  const { navigate } = useApp()
  const { data: contacts = [] } = useContacts()
  const rows = useNudges()
  return (
    <WidgetFrame title="People" icon={<Users className="text-muted" />} onOpen={() => navigate({ page: 'people' })}>
      {contacts.length === 0 ? (
        <Empty title="No people yet">Add the people you want to keep up with.</Empty>
      ) : rows.length === 0 ? (
        <Empty title="All caught up">No birthdays this week and no catch-up reminders due.</Empty>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto">
          {rows.map(({ contact, kind, text }) => (
            <li key={`${contact.id}-${kind}`}>
              <button type="button" onClick={() => navigate({ page: 'people', id: contact.id })} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-raised">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-2xs font-semibold text-muted">{initials(contact.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{contact.name}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted">
                    {kind === 'birthday' ? <Cake className="h-3 w-3 text-warn" /> : <CalendarClock className="h-3 w-3 text-faint" />}
                    {text}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  )
}

export function InsightWidget({ widget, date }: Props) {
  const { navigate } = useApp()
  const days = widget.days ?? 90
  const range = { from: addDays(date, -(days - 1)), to: date }
  const pinned = widget.pair
  const { data: analysis } = useData(['pair', pinned, range.from, range.to], () => api.analyzePair({ ...range, a: pinned?.a ?? '', b: pinned?.b ?? '', lagDays: pinned?.lagDays ?? 0 }), { enabled: !!pinned })
  const { data: scan } = useData(['scan', range.from, range.to], () => api.scanRelationships(range), { enabled: !pinned })
  const top = scan?.findings[0]

  return (
    <WidgetFrame
      title={pinned ? 'Pinned insight' : 'Strongest pattern'}
      icon={<FlaskConical className="text-muted" />}
      meta={`${days} days`}
      onOpen={() => navigate(pinned ? { page: 'insights', a: pinned.a, b: pinned.b, lagDays: pinned.lagDays } : top ? { page: 'insights', a: top.a.id, b: top.b.id, lagDays: top.lagDays } : { page: 'insights' })}
    >
      {pinned ? (
        analysis ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden">
            <p className="text-xs font-medium text-accent">{strengthLabel(analysis)}</p>
            <p className="text-sm leading-snug text-text">{describePair(analysis)}</p>
            {analysis.spearman && <p className="text-xs text-faint">Rank correlation {num(analysis.spearman.value, 2)} over {analysis.n} days · a pattern, not proof of cause</p>}
          </div>
        ) : (
          <Empty title="This comparison is unavailable">One of its metrics no longer has data.</Empty>
        )
      ) : top ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden">
          <p className="text-base font-medium leading-snug">{shortFinding(top.a, top.b, top.rho, top.lagDays)}</p>
          <p className="text-xs text-muted">
            {top.a.group} and {top.b.group} · rank correlation {num(top.rho, 2)} over {top.n} days
          </p>
          <p className="text-xs text-faint">A pattern in your records, not proof of cause.</p>
        </div>
      ) : (
        <Empty title="No clear patterns yet">Patterns show up once two trackers share about ten days of records.</Empty>
      )}
    </WidgetFrame>
  )
}

export function NoteWidget({ widget, onChange }: Props & { onChange: (patch: Partial<DashboardWidget>) => void }) {
  const [text, setText] = useState(widget.text ?? '')
  useEffect(() => setText(widget.text ?? ''), [widget.text])
  return (
    <WidgetFrame title={widget.title || 'Note'} icon={<StickyNote className="text-muted" />}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => text !== (widget.text ?? '') && onChange({ text })}
        placeholder="Write anything you want to keep in view."
        aria-label="Note"
        className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-faint focus:outline-none"
      />
    </WidgetFrame>
  )
}
